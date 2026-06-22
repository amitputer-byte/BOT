/* Storage-layer tests: the critical legacy migration (zero data loss,
 * idempotent, raw backup) and profile isolation (no leakage). */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE as E } from '../src/engine.js';
import * as Storage from '../src/storage.js';

/* ---- in-memory localStorage polyfill ---- */
function installLS() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() { return map.size; }
  };
  return map;
}

/* Build a realistic legacy ("gan-hakefel-v1") blob with genuine progress. */
function seedLegacy() {
  const cards = E.buildFactSpace();
  // Give a few cards real mastery so we can assert it survives.
  cards[0].state = 'mastered'; cards[0].box = 5; cards[0].nextDueAt = 999;
  cards[1].state = 'strong'; cards[1].box = 3;
  cards[2].state = 'practicing'; cards[2].box = 1;
  const blob = {
    version: 2,
    consentGiven: true,
    baselineDone: true,
    child: { nickname: 'תמרי', avatar: '👑', accessories: ['bow'] },
    settings: { sound: true, music: false, sessionLength: 10, analytics: true },
    cards,
    rewards: { stars: 42, unlocked: ['x4'], badges: ['first'], bossDone: ['twos'], decor: ['pond'], accessories: ['hat'], chests: 2, chestProgress: 3 },
    collection: { pets: { cat: { level: 2 } } },
    garden: { placed: [{ id: 'tree', x: 1, y: 2 }] },
    streak: { weekKey: '2026-25', days: ['mon', 'tue', 'wed'], shield: true },
    stats: { sessionsCompleted: 7, totalTimeMs: 600000, gamesPlayed: 12, arraysCorrect: 30, errorTags: { offByOne: 4 } },
    history: [{ masteryPct: 0.3, accuracy: 0.8 }],
    log: [{ ts: 1, type: 'app_open' }]
  };
  globalThis.localStorage.setItem(Storage.LEGACY_KEY, JSON.stringify(blob));
  return blob;
}

/* The app's structural backfill, passed to migrateLegacy as baseFn. */
function backfill(s) { return s; }

beforeEach(() => { installLS(); Storage._resetDurable(); });

test('legacy migration creates the "תמרי" profile with ALL data intact', () => {
  const legacy = seedLegacy();
  const res = Storage.migrateLegacy({ migrate: backfill, name: 'תמרי', avatar: '👑' });

  assert.equal(res.migrated, true);
  assert.equal(res.profile.name, 'תמרי');

  const profiles = Storage.listProfiles();
  assert.equal(profiles.length, 1);
  assert.equal(Storage.getActiveProfileId(), res.profile.id);

  const state = Storage.loadProfileState(res.profile.id);
  // mastery preserved
  assert.equal(state.cards.length, 66);
  assert.equal(state.cards[0].state, 'mastered');
  assert.equal(state.cards[0].box, 5);
  assert.equal(state.cards[1].state, 'strong');
  // inventory preserved (coins/stars, gems-equiv chests, pets, decor, skins/accessories)
  assert.equal(state.rewards.stars, 42);
  assert.equal(state.rewards.chests, 2);
  assert.deepEqual(state.rewards.decor, ['pond']);
  assert.deepEqual(state.rewards.accessories, ['hat']);
  assert.deepEqual(state.collection.pets, { cat: { level: 2 } });
  // streak preserved
  assert.deepEqual(state.streak.days, ['mon', 'tue', 'wed']);
  assert.equal(state.streak.shield, true);
  // settings + flags preserved
  assert.equal(state.settings.sessionLength, 10);
  assert.equal(state.consentGiven, true);
  assert.equal(state.baselineDone, true);
  // schema stamped
  assert.equal(state.schemaVersion, Storage.SCHEMA_VERSION);

  // raw backup exists and equals the ORIGINAL bytes
  const backup = Storage.getLegacyBackup();
  assert.ok(backup, 'raw backup present');
  assert.deepEqual(JSON.parse(backup), legacy);
});

test('legacy migration is idempotent (second run is a no-op)', () => {
  seedLegacy();
  const first = Storage.migrateLegacy({ migrate: backfill });
  const second = Storage.migrateLegacy({ migrate: backfill });

  assert.equal(first.migrated, true);
  assert.equal(second.migrated, false);
  assert.equal(second.reason, 'already');
  // still exactly one profile, same id, backup untouched
  assert.equal(Storage.listProfiles().length, 1);
  assert.equal(Storage.getActiveProfileId(), first.profile.id);
});

test('fresh install (no legacy) does not fabricate a profile', () => {
  const res = Storage.migrateLegacy({ migrate: backfill });
  assert.equal(res.migrated, false);
  assert.equal(res.reason, 'none');
  assert.equal(Storage.listProfiles().length, 0);
  assert.equal(Storage.getActiveProfileId(), null);
});

test('profiles are isolated — progress/inventory does not leak', () => {
  const a = Storage.createProfile({ name: 'תמרי', avatar: '👑' }, {
    cards: [{ id: '3x4', state: 'mastered' }],
    rewards: { stars: 100 }
  });
  const b = Storage.createProfile({ name: 'דני', avatar: '🦊' }, {
    cards: [{ id: '3x4', state: 'new' }],
    rewards: { stars: 0 }
  });

  assert.notEqual(a.id, b.id);
  const sa = Storage.loadProfileState(a.id);
  const sb = Storage.loadProfileState(b.id);
  assert.equal(sa.rewards.stars, 100);
  assert.equal(sb.rewards.stars, 0);
  assert.equal(sa.cards[0].state, 'mastered');
  assert.equal(sb.cards[0].state, 'new');

  // mutating + saving one profile must not touch the other
  sb.rewards.stars = 5;
  Storage.saveProfileState(b.id, sb);
  assert.equal(Storage.loadProfileState(a.id).rewards.stars, 100);
});

test('deleting a profile cleans its blob and repoints active', () => {
  const a = Storage.createProfile({ name: 'A' }, { cards: [], rewards: {} });
  const b = Storage.createProfile({ name: 'B' }, { cards: [], rewards: {} });
  Storage.setActiveProfileId(b.id);
  const newActive = Storage.deleteProfile(b.id);
  assert.equal(newActive, a.id);
  assert.equal(Storage.loadProfileState(b.id), null);
  assert.equal(Storage.listProfiles().length, 1);
});

test('applyMigrations stamps the blob up to the current schema version', () => {
  const blob = Storage.applyMigrations({ schemaVersion: 0, foo: 1 }, {}, (s) => { s.backfilled = true; return s; });
  assert.equal(blob.schemaVersion, Storage.SCHEMA_VERSION);
  assert.equal(blob.backfilled, true);
});

test('durable mirror lets recoverIfEmpty rehydrate after localStorage is wiped', async () => {
  const a = Storage.createProfile({ name: 'A' }, { cards: [{ id: '1' }], rewards: { stars: 5 } });
  // Simulate localStorage eviction: clear the layer's keys (durable mirror remains).
  Storage._clearAll();
  assert.equal(Storage.getRegistry().profiles.length, 0);
  const restored = await Storage.recoverIfEmpty();
  assert.equal(restored, true);
  assert.equal(Storage.listProfiles().length, 1);
  assert.equal(Storage.loadProfileState(a.id).rewards.stars, 5);
});

test('recoverIfEmpty is a no-op when localStorage already has data', async () => {
  Storage.createProfile({ name: 'A' }, { cards: [], rewards: {} });
  const restored = await Storage.recoverIfEmpty();
  assert.equal(restored, false);
});

test('a deleted profile is not resurrected by durable recovery', async () => {
  const a = Storage.createProfile({ name: 'A' }, { cards: [{ id: '1' }], rewards: {} });
  const b = Storage.createProfile({ name: 'B' }, { cards: [{ id: '1' }], rewards: { stars: 9 } });
  Storage.deleteProfile(b.id);
  // Simulate localStorage eviction; recover from the durable mirror.
  Storage._clearAll();
  await Storage.recoverIfEmpty();
  const ids = Storage.listProfiles().map((p) => p.id);
  assert.ok(ids.includes(a.id), 'kept profile recovered');
  assert.ok(!ids.includes(b.id), 'deleted profile NOT resurrected');
  assert.equal(Storage.loadProfileState(b.id), null);
});

test('autoBackup throttles per day, lists newest, and restores a snapshot', async () => {
  const a = Storage.createProfile({ name: 'A' }, { cards: [], rewards: { stars: 1 } });
  assert.equal(await Storage.autoBackup(a.id, { cards: [], rewards: { stars: 1 } }, { dayKey: '2026-1-1' }), true);
  assert.equal(await Storage.autoBackup(a.id, { cards: [], rewards: { stars: 2 } }, { dayKey: '2026-1-1' }), false, 'same day is throttled');
  assert.equal(await Storage.autoBackup(a.id, { cards: [], rewards: { stars: 9 } }, { dayKey: '2026-1-2' }), true);
  const list = await Storage.listBackups(a.id);
  assert.equal(list.length, 2);
  const day1 = list.find((b) => b.day === '2026-1-1');
  const data = await Storage.restoreBackup(a.id, day1.id);
  assert.equal(data.rewards.stars, 1);
  assert.equal(Storage.loadProfileState(a.id).rewards.stars, 1);
});

test('exportProfile + importProfile transfers a profile as a new one', () => {
  const a = Storage.createProfile({ name: 'תמרי', avatar: '👑' }, { cards: E.buildFactSpace(), rewards: { stars: 7 } });
  const env = Storage.exportProfile(a.id);
  assert.equal(env.format, Storage.PROFILE_EXPORT_FORMAT);
  assert.ok(Storage.isValidProfileExport(env));
  const before = Storage.listProfiles().length;
  const imp = Storage.importProfile(env);
  assert.ok(imp && imp.id !== a.id, 'creates a new profile with a fresh id');
  assert.equal(Storage.listProfiles().length, before + 1);
  assert.equal(Storage.loadProfileState(imp.id).rewards.stars, 7);
  assert.equal(Storage.getActiveProfileId(), a.id, 'import does not switch the active profile');
});

test('importProfile rejects invalid envelopes', () => {
  assert.equal(Storage.importProfile(null), null);
  assert.equal(Storage.importProfile({ format: 'nope' }), null);
  assert.equal(Storage.importProfile({ format: Storage.PROFILE_EXPORT_FORMAT, state: { cards: [] } }), null);
  assert.equal(Storage.isValidProfileExport({ format: Storage.PROFILE_EXPORT_FORMAT, state: { cards: new Array(66) } }), true);
});

test('autoBackup prunes snapshots to the keep limit', async () => {
  const a = Storage.createProfile({ name: 'A' }, { cards: [], rewards: {} });
  for (let i = 1; i <= 10; i++) {
    await Storage.autoBackup(a.id, { cards: [], rewards: { n: i } }, { dayKey: 'd' + i, keep: 3 });
  }
  const list = await Storage.listBackups(a.id);
  assert.equal(list.length, 3);
});
