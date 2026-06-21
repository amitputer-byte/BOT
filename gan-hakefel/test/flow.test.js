/* jsdom flow / regression test: the app boots into a seeded profile, lands on
 * home, RTL is intact, and all ten games render without throwing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const GAME_ROUTES = [
  'game_arrays', 'game_train', 'game_balloons', 'game_skip',
  'game_whack', 'game_shooter', 'game_memory', 'game_runner',
  'game_duel', 'game_rhythm'
];

test('app boots a seeded profile to home, RTL intact, all 10 games render', async () => {
  const dom = new JSDOM(
    '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"></head>' +
    '<body><div id="app" aria-live="polite"></div><div id="fx-layer"></div>' +
    '<div id="speak-region"></div></body></html>',
    { url: 'http://localhost/', pretendToBeVisual: true }
  );
  const { window } = dom;

  // Wire the globals the app reads as bare identifiers.
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  if (!globalThis.crypto) globalThis.crypto = (await import('node:crypto')).webcrypto;

  // Seed a ready profile (consent + baseline done) BEFORE importing the app,
  // so boot loads it and routes straight to home.
  const { ENGINE: E } = await import('../src/engine.js');
  const Storage = await import('../src/storage.js');
  const cards = E.buildFactSpace();
  cards[0].state = 'mastered'; cards[0].box = 5;
  const ready = {
    version: 2, consentGiven: true, baselineDone: true,
    child: { nickname: 'תמרי', avatar: '👑', accessories: [] },
    settings: { sound: false, music: false, haptics: false, reducedMotion: true, analytics: true, sessionLength: 8, freeEntry: true },
    cards,
    rewards: { stars: 10, unlocked: [], badges: [], bossDone: [], decor: [], accessories: [], chests: 0, chestProgress: 0 },
    collection: { pets: {} },
    garden: { placed: [] },
    streak: { weekKey: 'w', days: [], shield: true },
    stats: { sessionsCompleted: 1, totalTimeMs: 1000, lastSessionAt: 0, gamesPlayed: 0, arraysCorrect: 0, errorTags: {} },
    history: [], log: []
  };
  Storage.createProfile({ name: 'תמרי', avatar: '👑' }, ready);

  // Boot the app.
  await import('../src/app.js');

  // RTL preserved.
  assert.equal(window.document.documentElement.getAttribute('dir'), 'rtl');

  // Landed on home with content rendered.
  const bridge = window.__gankefel;
  assert.ok(bridge, 'test bridge exposed');
  assert.equal(bridge.route().name, 'home');
  assert.ok(window.document.getElementById('app').innerHTML.length > 50, 'home rendered');

  // Every game renders without throwing and produces DOM.
  for (const route of GAME_ROUTES) {
    bridge.go(route);
    const html = window.document.getElementById('app').innerHTML;
    assert.ok(html && html.length > 20, 'game rendered: ' + route);
    assert.equal(bridge.route().name, route, 'router on: ' + route);
  }

  // Games hub + parent dashboard also render.
  bridge.go('games_hub');
  assert.ok(window.document.getElementById('app').innerHTML.length > 20, 'games hub rendered');
  bridge.go('parent_dash');
  assert.ok(window.document.getElementById('app').innerHTML.length > 20, 'parent dashboard rendered');
});

test('fresh boot (no data) shows onboarding, not a game', async () => {
  const dom = new JSDOM(
    '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"></head>' +
    '<body><div id="app"></div><div id="fx-layer"></div><div id="speak-region"></div></body></html>',
    { url: 'http://localhost/', pretendToBeVisual: true }
  );
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage; // fresh, empty
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  // Reset the ESM module cache so app.js re-boots against the fresh DOM.
  const appUrl = '../src/app.js?fresh=' + Date.now();
  await import(appUrl);

  const bridge = window.__gankefel;
  assert.ok(bridge, 'test bridge exposed');
  assert.equal(bridge.route().name, 'onb_gate');
});
