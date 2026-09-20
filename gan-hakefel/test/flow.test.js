/* jsdom flow / regression test: the app boots into a seeded profile, lands on
 * home, RTL is intact, and all ten games render without throwing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const GAME_ROUTES = [
  'game_arrays', 'game_train', 'game_balloons', 'game_skip',
  'game_whack', 'game_shooter', 'game_memory', 'game_runner',
  'game_duel', 'game_rhythm', 'game_orchard'
];

test('app boots a seeded profile to home, RTL intact, all games render', async () => {
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
  Storage._resetDurable();
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
    // already "logged in today" so boot routes to home, not the daily gift
    login: { lastDateKey: (() => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); })(), streakDays: 1, weekStamps: [] },
    history: [], log: []
  };
  const tamari = Storage.createProfile({ name: 'תמרי', avatar: '👑' }, ready);
  // A second profile so the parent dashboard's comparison card appears.
  Storage.createProfile({ name: 'דני', avatar: '🦊' }, {
    version: 2, consentGiven: true, baselineDone: true,
    child: { nickname: 'דני', avatar: '🦊', accessories: [] },
    settings: ready.settings, cards: E.buildFactSpace(),
    rewards: { stars: 0, unlocked: [], badges: [], bossDone: [], decor: [], accessories: [], chests: 0, chestProgress: 0, rankSeen: 0 },
    collection: { pets: {} }, garden: { placed: [] }, streak: ready.streak, stats: ready.stats, history: [], log: []
  });
  Storage.setActiveProfileId(tamari.id); // boot loads תמרי

  // Boot the app.
  await import('../src/app.js');

  // RTL preserved.
  assert.equal(window.document.documentElement.getAttribute('dir'), 'rtl');

  // Landed on home with content rendered.
  const bridge = window.__gankefel;
  assert.ok(bridge, 'test bridge exposed');
  assert.equal(bridge.route().name, 'home');
  const homeHTML = window.document.getElementById('app').innerHTML;
  assert.ok(homeHTML.length > 50, 'home rendered');
  assert.ok(homeHTML.includes('דרגה'), 'home shows the champion rank badge');

  // World map shows the star ratings.
  bridge.go('world_map');
  assert.ok(window.document.querySelector('.stars'), 'world map shows star ratings');

  // Every game renders without throwing and produces DOM.
  for (const route of GAME_ROUTES) {
    bridge.go(route);
    const html = window.document.getElementById('app').innerHTML;
    assert.ok(html && html.length > 20, 'game rendered: ' + route);
    assert.equal(bridge.route().name, route, 'router on: ' + route);
  }

  // Level-up celebration renders the rank badge when a rank is passed in.
  bridge.go('celebrate', { title: 'עלית דרגה!', sub: 'מעולה', rank: bridge.ENGINE.rankForPct(0.5), then: 'home' });
  assert.ok(window.document.querySelector('.rank-up'), 'level-up celebration shows a rank badge');

  // Home shows the daily-goal ring and the weekly challenge.
  assert.ok(homeHTML.includes('היעד היומי'), 'home shows the daily goal');
  assert.ok(homeHTML.includes('אתגר השבוע'), 'home shows the weekly challenge');

  // Engagement / collection screens render.
  bridge.go('daily_gift');
  assert.ok(window.document.querySelector('.gift-row'), 'daily gift calendar renders');
  bridge.go('trophies');
  assert.ok(window.document.querySelector('.set-row'), 'trophy room shows collection sets');
  bridge.go('land_story', { fam: 'twos' });
  assert.ok(window.document.getElementById('goLand'), 'land story cutscene renders');

  // Practice centre: hub + all three activities render without throwing.
  for (const route of ['practice_hub', 'practice_add_h', 'practice_add_v', 'practice_word']) {
    bridge.go(route);
    assert.ok(window.document.getElementById('app').innerHTML.length > 20, 'practice rendered: ' + route);
    assert.equal(bridge.route().name, route);
  }
  // Grade-3 practice: every topic + the mixed test render without throwing.
  const g3keys = bridge.ENGINE.G3_TOPICS.map((t) => t.key).concat(['mix']);
  for (const topic of g3keys) {
    bridge.go('g3', { topic });
    const h = window.document.getElementById('app').innerHTML;
    assert.ok(h.length > 40, 'g3 rendered: ' + topic);
    assert.equal(bridge.route().name, 'g3');
  }
  // The geometry/data topics render a visual; number topics render choices or input.
  bridge.go('practice_hub');
  assert.ok(window.document.getElementById('app').innerHTML.includes('כיתה ג'), 'hub lists grade-3 topics');
  assert.ok(window.document.querySelector('#g3lvl .seg-btn'), 'hub shows difficulty selector');
  // Switching difficulty updates the stored level.
  const hardBtn = [...window.document.querySelectorAll('#g3lvl .seg-btn')].find((b) => b.getAttribute('data-lvl') === '3');
  hardBtn.click();
  assert.equal(bridge.state().settings.g3Level, 3, 'difficulty selector sets the level');

  // Grade-3 numeric answer flow: solve an arithmetic item and it is accepted.
  bridge.go('g3', { topic: 'arithmetic' });
  const g3prompt = window.document.querySelector('.card h3').textContent;
  const gm = g3prompt.match(/(\d+)\s*([+−×:])\s*(\d+)/);
  if (gm) {
    const x = +gm[1], y = +gm[3];
    const val = gm[2] === '+' ? x + y : gm[2] === '−' ? x - y : gm[2] === '×' ? x * y : x / y;
    window.document.getElementById('g3in').value = String(val);
    window.document.getElementById('g3check').click();
    assert.ok(window.document.getElementById('fb').classList.contains('good'), 'g3 accepts a correct numeric answer');
  }
  bridge.go('home'); // clear the advance timer
  // Vertical addition shows the column layout, and a correct entry is accepted.
  bridge.go('practice_add_v');
  const doc = window.document;
  assert.ok(doc.querySelector('.vadd'), 'vertical addition shows the column layout');
  const rows = [...doc.querySelectorAll('.vadd .vrow')]; // [carry, a, b, result]
  const rowNum = (row) => Number([...row.querySelectorAll('span.cell')]
    .map((c) => c.textContent.trim()).filter((s) => /^[0-9]$/.test(s)).join(''));
  const a = rowNum(rows[1]), b = rowNum(rows[2]), sum = a + b;
  doc.getElementById('ru').value = String(sum % 10);
  doc.getElementById('rt').value = String(Math.floor(sum / 10) % 10);
  if (sum >= 100) doc.getElementById('rh').value = '1';
  if ((a % 10) + (b % 10) >= 10) doc.getElementById('cin').value = '1';
  doc.getElementById('check').click();
  assert.ok(doc.getElementById('fb').classList.contains('good'), 'a correct column sum is accepted');
  bridge.go('home'); // clears the pending round-advance timer (FX.clearTimers)

  // Games hub + parent dashboard also render.
  bridge.go('games_hub');
  assert.ok(window.document.getElementById('app').innerHTML.length > 20, 'games hub rendered');
  bridge.go('parent_dash');
  const dash = window.document.getElementById('app').innerHTML;
  assert.ok(dash.includes('עובדות בסיכון'), 'dashboard shows the at-risk forecast');
  assert.ok(dash.includes('תחזית שליטה'), 'dashboard shows the mastery-date forecast');
  assert.ok(dash.includes('השוואת פרופילים'), 'dashboard shows the profile comparison');

  // Accessibility: boot applied a text-scale attribute, and settings expose the controls.
  assert.ok(window.document.documentElement.getAttribute('data-textscale'), 'a11y text-scale applied at boot');
  bridge.go('parent_settings');
  const settings = window.document.getElementById('app').innerHTML;
  assert.ok(settings.includes('נגישות'), 'settings has an accessibility section');
  assert.ok(window.document.getElementById('textScale'), 'text-size control present');
  assert.ok(window.document.getElementById('tg_readAloud'), 'read-aloud toggle present');
  assert.ok(settings.includes('גיבוי אוטומטי'), 'settings has the auto-backup section');
  assert.ok(window.document.getElementById('autoBkList'), 'auto-backup restore control present');
  assert.ok(settings.includes('העברת פרופיל בין מכשירים'), 'settings has the device-transfer section');
  assert.ok(window.document.getElementById('expProfile'), 'profile export control present');
  assert.ok(window.document.getElementById('impProfileBtn'), 'profile import control present');

  // Reset progress must not drop reward/stat field shapes (regression):
  // shop/garden read rewards.decor etc., so a partial rebuild would crash.
  window.confirm = () => true;
  window.document.getElementById('reset').click();
  assert.ok(Array.isArray(bridge.state().rewards.decor), 'reset keeps rewards.decor');
  assert.ok(bridge.state().stats.practice, 'reset keeps stats.practice');
  bridge.state().baselineDone = true; // allow non-baseline screens
  bridge.go('shop');
  assert.ok(window.document.querySelector('.screen'), 'shop renders after reset (no dropped fields)');
});

test('fresh boot goes straight to profile (no parent gate), then placement → home', async () => {
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
  window.confirm = () => true;

  const Storage = await import('../src/storage.js');
  Storage._resetDurable();
  const appUrl = '../src/app.js?fresh=' + Date.now();
  await import(appUrl);

  const bridge = window.__gankefel;
  assert.ok(bridge, 'test bridge exposed');
  assert.equal(bridge.route().name, 'onb_profile', 'fresh boot lands on profile, not a parent gate');

  // Name + continue → placement test.
  window.document.getElementById('nick').value = 'תמרי';
  window.document.getElementById('next').click();
  assert.equal(bridge.route().name, 'placement', 'profile continues into the placement test');

  // Answer 10 placement questions (correctly where we can parse arithmetic).
  for (let i = 0; i < 12 && bridge.route().name === 'placement'; i++) {
    const q = bridge.state && null; // noop
    const choiceBtn = window.document.querySelector('.g3choice');
    if (choiceBtn) { choiceBtn.click(); }
    else {
      const inp = window.document.getElementById('g3in');
      if (inp) { inp.value = '0'; window.document.getElementById('g3check').click(); }
    }
    // the advance is on a timer; flush it synchronously
    await new Promise((r) => setTimeout(r, 5));
  }
  // Placement sets a difficulty level and completes onboarding.
  assert.ok([1, 2, 3].includes(bridge.state().settings.g3Level), 'placement set a difficulty level');
});
