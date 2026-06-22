/* ============================================================================
 * src/storage.js — gan-hakefel profile-aware storage layer (ESM module)
 *
 * THE single chokepoint for all persistence. No other module may touch
 * localStorage directly. This is what makes a future move to IndexedDB and any
 * schema change a one-place edit.
 *
 * Responsibilities:
 *   - profile registry (list of profiles + active pointer + legacy flag)
 *   - per-profile state blobs, namespaced by id
 *   - schemaVersion stamping + a simple version -> migrationFn framework
 *   - the critical, idempotent legacy migration (old single blob -> "תמרי"),
 *     never destructive: a raw backup is written before anything else.
 *
 * All localStorage access is lazy + guarded so the app stays offline-robust and
 * the module is testable in Node with a small localStorage polyfill.
 * ==========================================================================*/

'use strict';

/* ---------- keys (namespaced) ---------- */
export const NS = 'gankefel';
export const LEGACY_KEY = 'gan-hakefel-v1';          // the original single blob
export const REGISTRY_KEY = NS + ':registry';        // profile registry
export const LEGACY_BACKUP_KEY = NS + ':legacy-backup'; // raw, untouched copy
export function profileKey(id) { return NS + ':profile:' + id; }

/* Current storage schema version (profile era). Bumps here drive migrations. */
export const SCHEMA_VERSION = 3;

/* ---------- low-level, guarded localStorage access ---------- */
function ls() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch (e) {}
  return null;
}
function readRaw(key) {
  var s = ls(); if (!s) return null;
  try { return s.getItem(key); } catch (e) { return null; }
}
function writeRaw(key, str) {
  var s = ls(); if (!s) return false;
  try { s.setItem(key, str); return true; } catch (e) { return false; }
}
function removeRaw(key) {
  var s = ls(); if (!s) return; try { s.removeItem(key); } catch (e) {}
}
function readJSON(key) {
  var raw = readRaw(key); if (raw == null) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function writeJSON(key, val) {
  try { return writeRaw(key, JSON.stringify(val)); } catch (e) { return false; }
}

/* ---------- ids ---------- */
export function genId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'p_' + crypto.randomUUID().slice(0, 8);
  } catch (e) {}
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- registry ---------- */
function freshRegistry() {
  return { schemaVersion: SCHEMA_VERSION, activeProfileId: null, legacyMigrated: false, profiles: [] };
}
export function getRegistry() {
  var reg = readJSON(REGISTRY_KEY);
  if (!reg || !Array.isArray(reg.profiles)) return freshRegistry();
  if (typeof reg.schemaVersion !== 'number') reg.schemaVersion = SCHEMA_VERSION;
  if (typeof reg.legacyMigrated !== 'boolean') reg.legacyMigrated = false;
  if (!('activeProfileId' in reg)) reg.activeProfileId = null;
  return reg;
}
export function saveRegistry(reg) {
  reg.schemaVersion = SCHEMA_VERSION;
  var ok = writeJSON(REGISTRY_KEY, reg);
  mirror(REGISTRY_KEY, reg); // durable IndexedDB mirror (best-effort, async)
  return ok;
}

/* ---------- profiles ---------- */
export function listProfiles() { return getRegistry().profiles.slice(); }
export function getProfile(id) {
  var ps = getRegistry().profiles;
  for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
  return null;
}
export function getActiveProfileId() { return getRegistry().activeProfileId; }
export function setActiveProfileId(id) {
  var reg = getRegistry();
  reg.activeProfileId = id;
  saveRegistry(reg);
}

/* Create a profile and persist its initial state. Sets it active by default.
 * Returns the created Profile = { id, name, avatar, createdAt }. */
export function createProfile(info, state) {
  info = info || {};
  var reg = getRegistry();
  var profile = {
    id: genId(),
    name: info.name || 'אלופ/ה',
    avatar: info.avatar || '👑',
    createdAt: info.createdAt || Date.now()
  };
  reg.profiles.push(profile);
  if (info.makeActive !== false) reg.activeProfileId = profile.id;
  saveRegistry(reg);
  if (state) saveProfileState(profile.id, state);
  return profile;
}

/* Patch a profile's display fields (name / avatar). */
export function updateProfile(id, patch) {
  var reg = getRegistry();
  for (var i = 0; i < reg.profiles.length; i++) {
    if (reg.profiles[i].id === id) {
      if (patch && patch.name != null) reg.profiles[i].name = patch.name;
      if (patch && patch.avatar != null) reg.profiles[i].avatar = patch.avatar;
      saveRegistry(reg);
      return reg.profiles[i];
    }
  }
  return null;
}

export function deleteProfile(id) {
  var reg = getRegistry();
  reg.profiles = reg.profiles.filter(function (p) { return p.id !== id; });
  if (reg.activeProfileId === id) {
    reg.activeProfileId = reg.profiles.length ? reg.profiles[0].id : null;
  }
  saveRegistry(reg);
  removeRaw(profileKey(id));
  return reg.activeProfileId;
}

/* ---------- per-profile state ---------- */
export function loadProfileState(id) {
  if (!id) return null;
  return readJSON(profileKey(id));
}
export function saveProfileState(id, state) {
  if (!id || !state) return false;
  try { state.schemaVersion = SCHEMA_VERSION; } catch (e) {}
  var ok = writeJSON(profileKey(id), state);
  mirror(profileKey(id), state); // durable IndexedDB mirror (best-effort, async)
  return ok;
}

/* ---------- schema migration framework ----------
 * migrations maps an integer fromVersion -> function(blob) that returns the blob
 * upgraded by one step. Applied repeatedly until the blob reaches SCHEMA_VERSION.
 * `baseFn` (optional) is a structural backfill run once after the chain, so old
 * blobs that predate schemaVersion get every newer field filled in. */
export function applyMigrations(blob, migrations, baseFn) {
  if (!blob || typeof blob !== 'object') return blob;
  migrations = migrations || {};
  var v = typeof blob.schemaVersion === 'number' ? blob.schemaVersion : 0;
  var guard = 0;
  while (v < SCHEMA_VERSION && guard < 100) {
    var fn = migrations[v];
    if (typeof fn === 'function') { blob = fn(blob) || blob; }
    v++;
    blob.schemaVersion = v;
    guard++;
  }
  if (typeof baseFn === 'function') blob = baseFn(blob) || blob;
  blob.schemaVersion = SCHEMA_VERSION;
  return blob;
}

/* ---------- legacy detection + backup ---------- */
export function hasLegacy() { return readRaw(LEGACY_KEY) != null; }
export function getLegacyBackup() { return readRaw(LEGACY_BACKUP_KEY); }

/* ---------- THE critical migration: legacy single blob -> "תמרי" profile ----
 * Idempotent: a second call is a no-op (guarded by registry.legacyMigrated and
 * by the presence of profiles). Never destructive:
 *   1. A raw, byte-for-byte backup of the old blob is written FIRST, and only
 *      if no backup already exists. Nothing is removed — the original legacy key
 *      is left in place as an extra safety net.
 *   2. The blob is upgraded via `migrate` (the app's backfill) and stored under
 *      a new profile named "תמרי", which becomes active.
 *
 * opts = { migrate, migrations, name, avatar }
 * Returns { migrated:boolean, reason?, profile? }. */
export function migrateLegacy(opts) {
  opts = opts || {};
  var reg = getRegistry();

  // Idempotency: already migrated, or profiles already exist.
  if (reg.legacyMigrated || reg.profiles.length > 0) {
    return { migrated: false, reason: 'already' };
  }

  var legacyRaw = readRaw(LEGACY_KEY);
  if (legacyRaw == null) {
    // Fresh install (no legacy data). Leave registry untouched so onboarding
    // can create the first profile normally.
    return { migrated: false, reason: 'none' };
  }

  // 1) RAW BACKUP FIRST — before any registry/profile write. Never overwrite.
  if (readRaw(LEGACY_BACKUP_KEY) == null) {
    writeRaw(LEGACY_BACKUP_KEY, legacyRaw);
  }

  // 2) Parse + upgrade the blob.
  var blob;
  try { blob = JSON.parse(legacyRaw); } catch (e) { return { migrated: false, reason: 'corrupt' }; }
  if (typeof blob.schemaVersion !== 'number') blob.schemaVersion = 0;
  blob = applyMigrations(blob, opts.migrations, opts.migrate);

  // 3) Create the "תמרי" profile from the legacy data and make it active.
  var name = (blob.child && blob.child.nickname) ? blob.child.nickname : (opts.name || 'תמרי');
  var avatar = (blob.child && blob.child.avatar) ? blob.child.avatar : (opts.avatar || '👑');
  var profile = {
    id: genId(),
    name: name,
    avatar: avatar,
    createdAt: Date.now()
  };
  saveProfileState(profile.id, blob);
  reg.profiles.push(profile);
  reg.activeProfileId = profile.id;
  reg.legacyMigrated = true;
  saveRegistry(reg);

  return { migrated: true, profile: profile };
}

/* Test/util helper: wipe everything this layer owns (does NOT touch the legacy
 * key or its backup, by design). */
export function _clearAll() {
  var reg = getRegistry();
  reg.profiles.forEach(function (p) { removeRaw(profileKey(p.id)); });
  removeRaw(REGISTRY_KEY);
}

/* ============================================================================
 * Durability layer: IndexedDB mirror + periodic auto-backup snapshots.
 *
 * Design (zero-data-loss, no app changes): localStorage stays the synchronous
 * source of truth for the live session. On every write we ALSO mirror to
 * IndexedDB asynchronously (best-effort), and we keep rolling daily snapshots.
 * If localStorage is ever evicted (Safari ITP, storage pressure, manual clear),
 * `recoverIfEmpty()` rehydrates it from IndexedDB at boot. Where IndexedDB is
 * unavailable (e.g. Node tests), an in-memory backend keeps the same code paths
 * exercised — only persistence differs.
 * ==========================================================================*/

var BACKUPS_KEEP = 7;
function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

/* Async durable backend: real IndexedDB when present, else in-memory. */
var DURABLE = (function () {
  var hasIDB = false;
  try { hasIDB = (typeof indexedDB !== 'undefined' && indexedDB !== null); } catch (e) { hasIDB = false; }

  if (!hasIDB) {
    var kv = {}, backups = [], seq = 1;
    return {
      get: function (k) { return Promise.resolve(Object.prototype.hasOwnProperty.call(kv, k) ? kv[k] : null); },
      set: function (k, v) { kv[k] = v; return Promise.resolve(true); },
      del: function (k) { delete kv[k]; return Promise.resolve(true); },
      addBackup: function (rec) { rec = Object.assign({ id: seq++ }, rec); backups.push(rec); return Promise.resolve(rec.id); },
      listBackups: function (pid) { return Promise.resolve(backups.filter(function (b) { return b.profileId === pid; }).map(function (b) { return Object.assign({}, b); })); },
      delBackup: function (id) { for (var i = 0; i < backups.length; i++) if (backups[i].id === id) { backups.splice(i, 1); break; } return Promise.resolve(true); },
      _reset: function () { kv = {}; backups = []; seq = 1; }
    };
  }

  var DB = 'gankefel', VER = 1;
  function open() {
    return new Promise(function (res, rej) {
      var req = indexedDB.open(DB, VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('backups')) {
          var st = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
          st.createIndex('profileId', 'profileId', { unique: false });
        }
      };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }
  function reqP(makeReq) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var r = makeReq(db);
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
    });
  }
  return {
    get: function (k) { return reqP(function (db) { return db.transaction('kv', 'readonly').objectStore('kv').get(k); }).then(function (v) { return v == null ? null : v; }); },
    set: function (k, v) { return reqP(function (db) { return db.transaction('kv', 'readwrite').objectStore('kv').put(v, k); }); },
    del: function (k) { return reqP(function (db) { return db.transaction('kv', 'readwrite').objectStore('kv').delete(k); }); },
    addBackup: function (rec) { return reqP(function (db) { return db.transaction('backups', 'readwrite').objectStore('backups').add(rec); }); },
    listBackups: function (pid) { return reqP(function (db) { return db.transaction('backups', 'readonly').objectStore('backups').index('profileId').getAll(pid); }).then(function (a) { return a || []; }); },
    delBackup: function (id) { return reqP(function (db) { return db.transaction('backups', 'readwrite').objectStore('backups').delete(id); }); },
    _reset: function () { return Promise.resolve(true); }
  };
})();

function swallow(p) { return p && p.catch ? p.catch(function () { return null; }) : Promise.resolve(null); }
/* Fire-and-forget durable mirror of a key/value. */
function mirror(key, val) { swallow(DURABLE.set(key, val)); }

/* Once-a-day snapshot of a profile's full state into the durable backups store,
 * pruned to the most recent BACKUPS_KEEP. Throttled via the registry so it is a
 * cheap no-op for the rest of the day. Returns a Promise<boolean>. */
export function autoBackup(id, state, opts) {
  opts = opts || {};
  if (!id || !state) return Promise.resolve(false);
  var day = opts.dayKey || dayKey();
  var reg = getRegistry();
  reg.lastBackup = reg.lastBackup || {};
  if (reg.lastBackup[id] === day && !opts.force) return Promise.resolve(false);
  reg.lastBackup[id] = day; saveRegistry(reg);
  return swallow(DURABLE.addBackup({ profileId: id, ts: Date.now(), day: day, data: state }))
    .then(function () { return pruneBackups(id, opts.keep || BACKUPS_KEEP); })
    .then(function () { return true; });
}
function pruneBackups(id, keep) {
  return swallow(DURABLE.listBackups(id)).then(function (list) {
    if (!list || list.length <= keep) return false;
    list.sort(function (a, b) { return b.ts - a.ts; });
    var extra = list.slice(keep);
    return Promise.all(extra.map(function (b) { return swallow(DURABLE.delBackup(b.id)); })).then(function () { return true; });
  });
}
/* List a profile's snapshots, newest first: [{id, ts, day}]. */
export function listBackups(id) {
  return swallow(DURABLE.listBackups(id)).then(function (list) {
    list = list || [];
    list.sort(function (a, b) { return b.ts - a.ts; });
    return list.map(function (b) { return { id: b.id, ts: b.ts, day: b.day }; });
  });
}
/* Restore a snapshot into the active store. Returns Promise<state|null>. */
export function restoreBackup(id, backupId) {
  return swallow(DURABLE.listBackups(id)).then(function (list) {
    var rec = (list || []).filter(function (b) { return b.id === backupId; })[0];
    if (!rec || !rec.data) return null;
    saveProfileState(id, rec.data); // writes localStorage + re-mirrors
    return rec.data;
  });
}

/* If localStorage has no registry (e.g. it was evicted) but IndexedDB does,
 * rehydrate localStorage from the durable mirror. Returns Promise<boolean>. */
export function recoverIfEmpty() {
  if (readRaw(REGISTRY_KEY) != null) return Promise.resolve(false);
  if (readRaw(LEGACY_KEY) != null) return Promise.resolve(false); // legacy path handles it
  return swallow(DURABLE.get(REGISTRY_KEY)).then(function (reg) {
    if (!reg || !Array.isArray(reg.profiles)) return false;
    writeJSON(REGISTRY_KEY, reg);
    return Promise.all(reg.profiles.map(function (p) {
      return swallow(DURABLE.get(profileKey(p.id))).then(function (data) {
        if (data) writeJSON(profileKey(p.id), data);
      });
    })).then(function () { return true; });
  });
}

/* Test helper: reset the in-memory durable backend. */
export function _resetDurable() { try { DURABLE._reset(); } catch (e) {} }

/* ============================================================================
 * Profile transfer between devices: a portable, versioned export envelope and a
 * non-destructive import (always creates a NEW profile, never overwrites).
 * ==========================================================================*/
export var PROFILE_EXPORT_FORMAT = 'gan-hakefel-profile';

/* Build a portable export of one profile (metadata + full state), or null. */
export function exportProfile(id) {
  var meta = getProfile(id);
  var state = loadProfileState(id);
  if (!meta || !state) return null;
  return {
    format: PROFILE_EXPORT_FORMAT,
    version: 1,
    exportedAt: Date.now(),
    profile: { name: meta.name, avatar: meta.avatar },
    state: state
  };
}

/* Validate an export envelope without importing it. */
export function isValidProfileExport(obj) {
  return !!(obj && obj.format === PROFILE_EXPORT_FORMAT &&
    obj.state && Array.isArray(obj.state.cards) && obj.state.cards.length === 66);
}

/* Import an export envelope as a brand-new profile on this device. Returns the
 * created Profile, or null if the envelope is invalid. Never overwrites an
 * existing profile and does not change the active profile. */
export function importProfile(obj) {
  if (!isValidProfileExport(obj)) return null;
  var name = (obj.profile && obj.profile.name) || 'אלופ/ה';
  var avatar = (obj.profile && obj.profile.avatar) || '👑';
  return createProfile({ name: name, avatar: avatar, makeActive: false }, obj.state);
}

export default {
  NS, LEGACY_KEY, REGISTRY_KEY, LEGACY_BACKUP_KEY, SCHEMA_VERSION,
  profileKey, genId,
  getRegistry, saveRegistry,
  listProfiles, getProfile, getActiveProfileId, setActiveProfileId,
  createProfile, updateProfile, deleteProfile,
  loadProfileState, saveProfileState,
  applyMigrations, hasLegacy, getLegacyBackup, migrateLegacy,
  autoBackup, listBackups, restoreBackup, recoverIfEmpty, _clearAll, _resetDurable,
  PROFILE_EXPORT_FORMAT, exportProfile, isValidProfileExport, importProfile
};
