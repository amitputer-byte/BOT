/* ============================================================================
 * src/app.js — gan-hakefel application layer (UI / state / content / games /
 * parent area). Uses ENGINE (pure, tested) and the profile-aware Storage layer.
 * Everything is local, offline, with no external dependency.
 * ==========================================================================*/
import { ENGINE } from "./engine.js";
import * as Storage from "./storage.js";

(function () {
  'use strict';
  var E = ENGINE;
  var app = document.getElementById('app');

  /* ---------- analytics taxonomy ---------- */
  var EV = {
    app_open: 'app_open', onboarding_started: 'onboarding_started', onboarding_completed: 'onboarding_completed',
    baseline_completed: 'baseline_completed', lesson_started: 'lesson_started', lesson_completed: 'lesson_completed',
    review_started: 'review_started', review_completed: 'review_completed', fact_answered: 'fact_answered',
    hint_used: 'hint_used', fact_mastered: 'fact_mastered', lapse_detected: 'lapse_detected',
    reward_earned: 'reward_earned', streak_updated: 'streak_updated', parent_dashboard_viewed: 'parent_dashboard_viewed',
    privacy_setting_changed: 'privacy_setting_changed', sync_enabled: 'sync_enabled', sync_disabled: 'sync_disabled',
    game_started: 'game_started', game_completed: 'game_completed'
  };

  /* ---------- state ---------- */
  function freshState() {
    return {
      version: 2, consentGiven: false, baselineDone: false,
      child: { nickname: 'תמרי', avatar: '👑', accessories: [] },
      settings: { sound: true, music: false, zen: false, haptics: true, reducedMotion: false, analytics: true, localOnly: true, sessionLength: 8, freeEntry: true, theme: 'auto', readAloud: true, textScale: 'normal', dyslexia: false },
      cards: E.buildFactSpace(),
      rewards: { stars: 0, unlocked: [], badges: [], bossDone: [], decor: [], accessories: [], chests: 0, chestProgress: 0, rankSeen: 0 },
      collection: { pets: {}, buddy: null },
      garden: { placed: [] },
      streak: { weekKey: weekKeyOf(Date.now()), days: [], shield: true },
      stats: { sessionsCompleted: 0, totalTimeMs: 0, lastSessionAt: 0, gamesPlayed: 0, arraysCorrect: 0, errorTags: {}, practice: { addCorrect: 0, addTotal: 0, wordCorrect: 0, wordTotal: 0 } },
      daily: { dateKey: '', correct: 0, sessions: 0, goalMet: false },
      login: { lastDateKey: '', streakDays: 0, weekStamps: [] },
      weekly: { weekKey: '', progress: 0, done: false },
      records: { bestSessionCorrect: 0, bestGameScore: 0 },
      history: [],
      log: []
    };
  }
  /* The id of the profile currently loaded into S. null while a new profile is
   * being drafted in onboarding (before it is persisted). */
  var activeProfileId = null;
  var S = freshState();

  /* Backfill any fields added in later versions so upgrades never lose progress.
   * Doubles as the structural migration `baseFn` for the storage layer. */
  function migrate(s) {
    var d = freshState();
    s.version = 2;
    s.child = Object.assign({}, d.child, s.child || {});
    if (!Array.isArray(s.child.accessories)) s.child.accessories = [];
    s.settings = Object.assign({}, d.settings, s.settings || {});
    s.rewards = Object.assign({}, d.rewards, s.rewards || {});
    if (!Array.isArray(s.rewards.bossDone)) s.rewards.bossDone = [];
    if (!Array.isArray(s.rewards.decor)) s.rewards.decor = [];
    if (!Array.isArray(s.rewards.accessories)) s.rewards.accessories = [];
    if (typeof s.rewards.chests !== 'number') s.rewards.chests = 0;
    if (typeof s.rewards.chestProgress !== 'number') s.rewards.chestProgress = 0;
    // Seed the "last seen rank" to the player's CURRENT rank so existing
    // progress never triggers a retroactive flood of level-up celebrations.
    if (typeof s.rewards.rankSeen !== 'number') {
      try { s.rewards.rankSeen = E.rankForCards(s.cards).index; } catch (e) { s.rewards.rankSeen = 0; }
    }
    s.collection = Object.assign({ pets: {}, buddy: null }, s.collection || {});
    if (!s.collection.pets || typeof s.collection.pets !== 'object') s.collection.pets = {};
    if (!('buddy' in s.collection)) s.collection.buddy = null;
    s.garden = Object.assign({ placed: [] }, s.garden || {});
    if (!Array.isArray(s.garden.placed)) s.garden.placed = [];
    s.stats = Object.assign({}, d.stats, s.stats || {});
    if (!s.stats.errorTags || typeof s.stats.errorTags !== 'object') s.stats.errorTags = {};
    if (!s.stats.practice || typeof s.stats.practice !== 'object') s.stats.practice = { addCorrect: 0, addTotal: 0, wordCorrect: 0, wordTotal: 0 };
    if (!Array.isArray(s.history)) s.history = [];
    if (!Array.isArray(s.log)) s.log = [];
    s.streak = Object.assign({}, d.streak, s.streak || {});
    s.daily = Object.assign({ dateKey: '', correct: 0, sessions: 0, goalMet: false }, s.daily || {});
    s.login = Object.assign({ lastDateKey: '', streakDays: 0, weekStamps: [] }, s.login || {});
    if (!Array.isArray(s.login.weekStamps)) s.login.weekStamps = [];
    s.weekly = Object.assign({ weekKey: '', progress: 0, done: false }, s.weekly || {});
    s.records = Object.assign({ bestSessionCorrect: 0, bestGameScore: 0 }, s.records || {});
    s.schemaVersion = Storage.SCHEMA_VERSION;
    return s;
  }

  /* Load the active profile's state through the storage layer. Returns a fresh
   * state if there is no active profile yet or the stored blob is unusable. */
  function loadActiveState() {
    var id = Storage.getActiveProfileId();
    activeProfileId = (id && Storage.getProfile(id)) ? id : null;
    if (!activeProfileId) return freshState();
    var s = Storage.loadProfileState(activeProfileId);
    if (!s || !Array.isArray(s.cards) || s.cards.length !== 66) return freshState();
    return migrate(s);
  }
  /* Persist S to the active profile. No-op while a profile is still a draft. */
  function save() { if (activeProfileId) Storage.saveProfileState(activeProfileId, S); }
  function cardById(id) { for (var i = 0; i < S.cards.length; i++) if (S.cards[i].id === id) return S.cards[i]; return null; }
  function cardAt(a, b) { return cardById(E.factId(a, b)); }

  /* ---------- analytics (local only) ---------- */
  function logEvent(type, params) {
    if (!S.settings.analytics) return;
    S.log.push(Object.assign({ ts: Date.now(), type: type }, params || {}));
    if (S.log.length > 800) S.log.splice(0, S.log.length - 800);
  }

  /* ---------- audio + a11y ---------- */
  function speak(text) {
    var region = document.getElementById('speak-region');
    if (region) region.textContent = text; // always update the aria-live region
    // Read-aloud is its own accessibility control, independent of SFX/music.
    if (!S.settings.readAloud || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'he-IL'; u.rate = 0.95;
      var voices = window.speechSynthesis.getVoices();
      var he = voices.find(function (v) { return /he|iw/i.test(v.lang); });
      if (he) u.voice = he;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function applyMotionPref() {
    var reduce = S.settings.reducedMotion ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.body.classList.toggle('reduced', !!reduce);
  }
  /* Living world + seasonal theming: set a theme on <html> (auto = by season)
   * and a day/night flag by the clock. Cheap, persists across re-renders. */
  function applyTheme() {
    try {
      var root = document.documentElement;
      var pref = (S.settings && S.settings.theme) || 'auto';
      var theme = (pref === 'auto') ? E.seasonalTheme(new Date().getMonth()) : pref;
      root.setAttribute('data-theme', theme);
      var hr = new Date().getHours();
      root.setAttribute('data-time', (hr >= 6 && hr < 18) ? 'day' : 'night');
    } catch (e) {}
  }
  /* Accessibility: text size + dyslexia-friendly spacing/font. */
  function applyA11y() {
    try {
      var root = document.documentElement;
      root.setAttribute('data-textscale', (S.settings && S.settings.textScale) || 'normal');
      root.classList.toggle('dyslexia', !!(S.settings && S.settings.dyslexia));
    } catch (e) {}
  }

  /* ============================== FX ENGINE (sound + juice, offline, asset-free) ==============================
   * SFX are synthesized with the Web Audio API (no audio files), so it stays a single offline file.
   * Everything is guarded so it is a no-op on devices/test envs without Web Audio. */
  var FX = (function () {
    var ctx = null, music = null, unlocked = false, gameTimers = [];
    function ac() {
      if (ctx) return ctx;
      try { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); } catch (e) { ctx = null; }
      return ctx;
    }
    function unlock() { var c = ac(); if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} } unlocked = true; if (S.settings.music) startMusic(); }
    function tone(freq, dur, type, vol, when) {
      var c = ac(); if (!c || !S.settings.sound) return;
      try {
        var t = c.currentTime + (when || 0);
        var o = c.createOscillator(), g = c.createGain();
        o.type = type || 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
      } catch (e) {}
    }
    function sfx(name) {
      switch (name) {
        case 'correct': tone(660, 0.12, 'triangle', 0.2); tone(990, 0.14, 'triangle', 0.16, 0.08); break;
        case 'combo': tone(880, 0.1, 'square', 0.14); tone(1320, 0.12, 'square', 0.12, 0.06); break;
        case 'pop': tone(520, 0.08, 'sine', 0.18); break;
        case 'wrong': tone(200, 0.18, 'sawtooth', 0.12); break;
        case 'win': [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.18, i * 0.1); }); break;
        case 'tick': tone(440, 0.04, 'square', 0.08); break;
        case 'coin': tone(988, 0.07, 'square', 0.16); tone(1319, 0.09, 'square', 0.14, 0.05); break;
      }
      haptic(name === 'wrong' ? 30 : 12);
    }
    function haptic(ms) { if (S.settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
    function startMusic() {
      var c = ac(); if (!c || !S.settings.sound || music) return;
      try {
        music = { osc: c.createOscillator(), gain: c.createGain(), lfo: c.createOscillator(), lfoGain: c.createGain() };
        music.osc.type = 'sine'; music.osc.frequency.value = 220;
        music.gain.gain.value = 0.025;
        music.lfo.frequency.value = 0.12; music.lfoGain.gain.value = 40;
        music.lfo.connect(music.lfoGain); music.lfoGain.connect(music.osc.frequency);
        music.osc.connect(music.gain); music.gain.connect(c.destination);
        music.osc.start(); music.lfo.start();
      } catch (e) { music = null; }
    }
    function stopMusic() { if (music) { try { music.osc.stop(); music.lfo.stop(); } catch (e) {} music = null; } }
    function burst(x, y, color, n) {
      if (document.body.classList.contains('reduced')) return;
      var host = document.getElementById('fx-layer'); if (!host) return;
      n = n || 12;
      for (var i = 0; i < n; i++) {
        var p = document.createElement('span'); p.className = 'particle';
        var ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 60;
        p.style.left = x + 'px'; p.style.top = y + 'px';
        p.style.background = color || ['#ffd23f', '#3aa76d', '#3775D6', '#ff7aa2'][i % 4];
        p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
        host.appendChild(p);
        (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 750); })(p);
      }
    }
    function burstAt(el, color, n) {
      try { var r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, color, n); } catch (e) {}
    }
    function shake() { if (document.body.classList.contains('reduced')) return; var a = document.getElementById('app'); if (!a) return; a.classList.remove('shake-x'); void a.offsetWidth; a.classList.add('shake-x'); }
    function addTimer(id) { gameTimers.push(id); return id; }
    function clearTimers() { gameTimers.forEach(function (id) { clearInterval(id); clearTimeout(id); }); gameTimers = []; }
    return { unlock: unlock, sfx: sfx, burst: burst, burstAt: burstAt, shake: shake, startMusic: startMusic, stopMusic: stopMusic, addTimer: addTimer, clearTimers: clearTimers, haptic: haptic };
  })();
  // Unlock audio on first interaction (browsers require a gesture).
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function once() { FX.unlock(); window.removeEventListener(ev, once); }, { once: true });
  });

  // Floating combo/score heads-up for action games.
  function comboHud(run) {
    return '<div class="hud"><span class="hud-score">⭐ <span class="num" id="hudScore">' + (run.score || 0) + '</span></span>' +
      '<span class="hud-combo" id="hudCombo">' + (run.combo > 1 ? '🔥 ' + run.combo : '') + '</span></div>';
  }
  function hudUpdate(run) {
    var s = document.getElementById('hudScore'); if (s) s.textContent = run.score || 0;
    var c = document.getElementById('hudCombo'); if (c) { c.textContent = run.combo > 1 ? '🔥 ' + run.combo : ''; if (run.combo > 1) { c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); } }
  }

  /* ---------- content banks (Hebrew) ---------- */
  var C = {
    successCommon: ['יפה מאוד!', 'כל הכבוד!', 'מעולה!', 'איזה יופי!', 'נכון בדיוק!'],
    successIndep: ['פתרת לבד — אלופה!', 'מהר ומדויק!', 'ידע אמיתי, כל הכבוד!', 'וואו, ישר וחלק!'],
    errorSoft: ['כמעט! בואי ננסה יחד.', 'לא נורא, ננסה שוב.', 'טעות קטנה — תכף נצליח.', 'קרוב! נסתכל על הקבוצות.'],
    hintByFamily: {
      zeros: 'כל מספר כפול 0 שווה 0 — אין אף קבוצה.',
      ones: 'כל מספר כפול 1 נשאר אותו מספר — קבוצה אחת בלבד.',
      twos: 'כפל ב-2 זה פעמיים — המספר ועוד פעם המספר.',
      tens: 'כפל ב-10 — פשוט מוסיפים 0 בסוף המספר.',
      fives: 'כפל ב-5 — קופצים בחמישיות: 5, 10, 15, 20...',
      fours: 'כפל ב-4 — כופלים ב-2, ואז שוב ב-2 (כפול-כפול).',
      threes: 'כפל ב-3 — קחי כפל ב-2 והוסיפי עוד קבוצה אחת.',
      sixes: 'כפל ב-6 — כמו כפל ב-5 ועוד קבוצה, או כפל ב-3 כפול 2.',
      nines: 'כפל ב-9 — כמו כפל ב-10, ואז מורידים את המספר עצמו.',
      hard: 'אפשר לפרק: 7×8 = 7×4 + 7×4. 8×8 = 8×5 + 8×3.'
    },
    concept: {
      zeros: { title: 'כפל באפס', lines: ['אפס קבוצות — אין כלום.', 'כל מספר כפול 0 שווה 0.'] },
      ones: { title: 'כפל באחד', lines: ['קבוצה אחת בלבד.', 'כל מספר כפול 1 נשאר אותו מספר.'] },
      twos: { title: 'כפל בשתיים', lines: ['שתי קבוצות שוות.', 'זה פשוט המספר ועוד פעם המספר.'] },
      tens: { title: 'כפל בעשר', lines: ['עשר קבוצות שוות.', 'מוסיפים 0 בסוף — וזהו!'] },
      fives: { title: 'כפל בחמש', lines: ['קופצים בחמישיות.', '5, 10, 15, 20...'] },
      fours: { title: 'כפל בארבע', lines: ['ארבע קבוצות.', 'טריק: כפול-כפול. כופלים ב-2 ואז שוב ב-2.'] },
      threes: { title: 'כפל בשלוש', lines: ['שלוש קבוצות שוות.', 'אפשר: כפל ב-2 ועוד קבוצה אחת.'] },
      sixes: { title: 'כפל בשש', lines: ['שש קבוצות.', 'טריק: כפל ב-5 ועוד קבוצה אחת.'] },
      nines: { title: 'כפל בתשע', lines: ['תשע קבוצות.', 'טריק: כפל ב-10 פחות המספר.'] },
      hard: { title: 'המשפחות הקשות', lines: ['7 ו-8 הכי מאתגרים.', 'מפרקים לחלקים שאנחנו כבר יודעים.'] }
    },
    tutorialLines: ['היי! אני שועלי, ואלמד אותך כפל בעזרת קבוצות.', 'כל תרגיל זה פשוט כמה קבוצות שוות. בואי ננסה אחד קל.'],
    wordTemplates: [
      function (a, b) { return 'בגינה יש <span class="num">' + a + '</span> ערוגות, ובכל ערוגה <span class="num">' + b + '</span> פרחים. כמה פרחים יש בסך הכול?'; },
      function (a, b) { return 'ל-<span class="num">' + a + '</span> ילדים יש <span class="num">' + b + '</span> בלונים לכל אחד. כמה בלונים יש יחד?'; },
      function (a, b) { return 'יש <span class="num">' + a + '</span> סלים, ובכל סל <span class="num">' + b + '</span> תפוחים. כמה תפוחים בסך הכול?'; },
      function (a, b) { return '<span class="num">' + a + '</span> פרפרים, ולכל פרפר <span class="num">' + b + '</span> נקודות על הכנפיים. כמה נקודות יש?'; }
    ],
    addWordTemplates: [
      function (a, b) { return 'לתמרי יש <span class="num">' + a + '</span> מדבקות, וקיבלה עוד <span class="num">' + b + '</span>. כמה מדבקות יש לה עכשיו?'; },
      function (a, b) { return 'בגינה <span class="num">' + a + '</span> פרחים אדומים ו-<span class="num">' + b + '</span> פרחים צהובים. כמה פרחים יש בסך הכול?'; },
      function (a, b) { return 'באוטובוס נסעו <span class="num">' + a + '</span> ילדים, ובתחנה עלו עוד <span class="num">' + b + '</span>. כמה ילדים יש עכשיו באוטובוס?'; },
      function (a, b) { return 'בקופה היו <span class="num">' + a + '</span> שקלים, ונוספו עוד <span class="num">' + b + '</span>. כמה שקלים יש בקופה?'; },
      function (a, b) { return 'דנה אספה <span class="num">' + a + '</span> צדפים בבוקר ו-<span class="num">' + b + '</span> אחרי הצהריים. כמה צדפים אספה?'; }
    ]
  };
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------- תמרי, אלופת העולם — התאמה אישית + עידוד מבוסס-מאמץ ---------- */
  function NAME() { return (S.child && S.child.nickname) ? S.child.nickname : 'תמרי'; }
  function fill(s) { return String(s).replace(/\{n\}/g, NAME()); }
  function cheer(bank) { return fill(pick(bank)); }
  var pendingCrowns = []; // family-mastery crownings to celebrate next
  var CHAMP = {
    // נאמר בבית/בין תרגילים — מרים, ממוקד-מאמץ וצמיחה
    affirm: [
      'את אלופת העולם, {n}! 👑',
      '{n}, המוח שלך מתחזק עם כל תרגיל 💪',
      'אלופה אמיתית מנסה שוב — וזאת בדיוק את, {n}',
      'כל טעות עושה אותך חכמה יותר, {n} ✨',
      'תראי כמה התקדמת, {n}!',
      '{n} הכפל-אלופה! קדימה לעוד אחד 👑',
      'את לא מוותרת — ולכן את אלופה, {n}',
      'גאים בך, {n}. ממשיכות לנצח!',
      'צעד אחרי צעד — ככה אלופות נבנות, {n}',
      'את שולטת בזה, {n}. בואי נראה לעולם 🌍👑'
    ],
    success: ['כל הכבוד, {n}!', 'אלופה, {n}! 👑', '{n}, פתרת לבד — מדהים!', 'יש! {n} ממשיכה לנצח', 'מדויק, {n}!'],
    successIndep: ['{n}, לבד ומהר — אלופת אמת! 👑', 'וואו {n}, ידע אמיתי! ⭐', '{n} הכפל-אלופה! מנצחת!', 'בול בפוני, {n}! 👑'],
    error: [
      'כמעט, {n}! אלופות לומדות מטעויות. ננסה שוב 💪',
      'לא נורא, {n} — ככה המוח גדל. בואי נראה יחד',
      '{n}, טעות קטנה, ואנחנו ממש קרובות!',
      'עוד ניסיון, {n} — את תצליחי, אני יודע 👑'
    ]
  };

  /* ---------- small helpers ---------- */
  function mexpr(s) { return '<span class="mexpr">' + s + '</span>'; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function reverseDigits(n) { return Number(String(n).split('').reverse().join('')); }
  function productChoices(p, a, b) {
    var set = {}; set[p] = 1; var ordered = [];
    function add(x) { x = Math.round(x); if (x >= 0 && x <= 120 && !set[x]) { set[x] = 1; ordered.push(x); } }
    // Tier 1 — most diagnostic distractors
    add(a + b);                                   // added instead of multiplied
    shuffle([a * (b + 1), (a + 1) * b, a * (b - 1), (a - 1) * b]).forEach(add); // adjacent facts (= p±a, p±b)
    // Tier 2 — near misses
    shuffle([p + 1, p - 1, p + 2, p - 2]).forEach(add);
    if (p >= 10) add(reverseDigits(p));           // digit reversal
    var picks = [p].concat(ordered.slice(0, 3));
    var n = p + 3; while (picks.length < 4) { if (n >= 0 && picks.indexOf(n) < 0) picks.push(n); n++; }
    return shuffle(picks);
  }
  // Classify a wrong answer into a known multiplication-misconception bucket.
  function classifyError(a, b, p, picked) {
    if (picked === p) return null;
    if (picked === a + b && a + b !== p) return 'added';
    if (p >= 10 && picked === reverseDigits(p) && reverseDigits(p) !== p) return 'reversed';
    if (picked === a * (b + 1) || picked === a * (b - 1) || picked === (a + 1) * b || picked === (a - 1) * b) return 'adjacent';
    if (Math.abs(picked - p) <= 2) return 'near';
    return 'other';
  }
  var ERR_LABEL = {
    added: 'חיברה במקום לכפול',
    adjacent: 'עובדה שכנה (קבוצה פחות/יותר)',
    near: 'קרוב מאוד (±1/±2)',
    reversed: 'היפוך ספרות',
    other: 'טעות אחרת'
  };
  function recordError(card, picked) {
    var tag = classifyError(card.a, card.b, card.product, picked);
    if (!tag) return;
    S.stats.errorTags[tag] = (S.stats.errorTags[tag] || 0) + 1;
    logEvent('error_pattern', { fact: card.id, tag: tag, picked: picked });
  }
  function operandChoices(correct) {
    var set = {}; set[correct] = 1;
    var cands = shuffle([correct + 1, correct - 1, correct + 2, correct - 2, correct + 3, 10 - correct]);
    for (var i = 0; i < cands.length; i++) { var x = cands[i]; if (x >= 0 && x <= 10 && !set[x]) { set[x] = 1; if (Object.keys(set).length >= 4) break; } }
    var n = 0; while (Object.keys(set).length < 4) { if (!set[n]) set[n] = 1; n++; }
    return shuffle(Object.keys(set).map(Number));
  }
  function weekKeyOf(ts) {
    var d = new Date(ts); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    var yearStart = new Date(d.getFullYear(), 0, 1);
    var week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getFullYear() + '-W' + week;
  }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function arrayDots(rows, cols, cls) {
    rows = Math.max(0, rows); cols = Math.max(0, cols);
    if (rows === 0 || cols === 0) return '<div class="array ' + (cls || '') + '"><div class="muted">0</div></div>';
    var html = '<div class="array ' + (cls || '') + '" style="grid-template-columns:repeat(' + cols + ',1fr)" aria-hidden="true">';
    for (var i = 0; i < rows * cols; i++) html += '<span class="dot"></span>';
    return html + '</div>';
  }

  /* ---------- rewards / badges / streak ---------- */
  var BADGE_LABEL = {
    first_lesson: '🎓 שיעור ראשון', zeros_master: '0️⃣ אלוף האפסים', ones_master: '1️⃣ אלוף האחדים',
    twos_master: '✌️ אלוף הזוגות', tens_master: '🔟 אלוף העשרות', fives_master: '🖐️ אלוף החמישיות',
    fours_master: '🍀 אלוף הארבעות', threes_master: '🔺 אלוף השלשות', sixes_master: '🎲 אלוף השישיות',
    nines_master: '⭐ אלוף התשעות', hard_master: '🏆 אלוף הקשים',
    array_expert: '🌱 מומחה מערכים', commutative_hero: '🔄 גיבור ההיפוך', star_collector: '🌟 אספן הכוכבים'
  };
  function awardStars(n, reason) {
    if (n <= 0) return; S.rewards.stars += n;
    logEvent(EV.reward_earned, { amount: n, reason: reason });
  }
  /* ---------- engagement: daily goal, weekly challenge, records ---------- */
  var DAILY_GOAL = E.DAILY_GOAL_DEFAULT;
  /* Count progress toward today's goal. Resets at a new day. Returns true the
   * moment the goal is first met today (so the caller can celebrate). */
  function bumpDaily(correctDelta, sessionDelta) {
    var dk = todayKey();
    if (S.daily.dateKey !== dk) { S.daily = { dateKey: dk, correct: 0, sessions: 0, goalMet: false }; }
    S.daily.correct += (correctDelta || 0);
    S.daily.sessions += (sessionDelta || 0);
    var justMet = false;
    if (!S.daily.goalMet && S.daily.correct >= DAILY_GOAL) { S.daily.goalMet = true; justMet = true; awardStars(5, 'daily_goal'); }
    return justMet;
  }
  /* Advance the rotating weekly challenge. Resets at a new week. Returns true
   * the moment the challenge is completed (caller celebrates + rewards). */
  function bumpWeekly(kind, n) {
    var wk = weekKeyOf(Date.now());
    var ch = E.pickWeeklyChallenge(wk);
    if (S.weekly.weekKey !== wk) { S.weekly = { weekKey: wk, progress: 0, done: false }; }
    if (ch.kind !== kind || S.weekly.done) return false;
    S.weekly.progress += (n || 1);
    if (S.weekly.progress >= ch.target) { S.weekly.done = true; awardStars(15, 'weekly:' + ch.id); return true; }
    return false;
  }
  function setRecord(key, value) {
    if (!S.records) S.records = { bestSessionCorrect: 0, bestGameScore: 0 };
    if ((value || 0) > (S.records[key] || 0)) { S.records[key] = value; return true; }
    return false;
  }
  /* Daily login streak + reward. Returns true the first time today, so boot can
   * show the daily-gift calendar. */
  function checkLogin() {
    var dk = todayKey();
    if (S.login.lastDateKey === dk) return false;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yKey = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    S.login.streakDays = (S.login.lastDateKey === yKey) ? (S.login.streakDays || 0) + 1 : 1;
    S.login.lastDateKey = dk;
    S.login.weekStamps = (S.login.weekStamps || []).concat([dk]).slice(-7);
    var reward = E.loginRewardForDay(S.login.streakDays);
    S.login.lastReward = reward;
    if (reward > 0) awardStars(reward, 'login_day:' + S.login.streakDays);
    save();
    return true;
  }

  /* If the player's champion rank just went up, record it and return the new
   * rank (so the caller can celebrate the level-up). Otherwise null. */
  function popLevelUp() {
    var rk = E.rankForCards(S.cards);
    if (rk.index > (S.rewards.rankSeen || 0)) {
      S.rewards.rankSeen = rk.index; save();
      logEvent('rank_up', { rank: rk.key, index: rk.index });
      return rk;
    }
    return null;
  }
  function giveBadge(key) {
    if (S.rewards.badges.indexOf(key) >= 0) return false;
    S.rewards.badges.push(key); awardStars(5, 'badge:' + key);
    if (/_master$/.test(key)) {
      var fam = key.replace('_master', '');
      if (E.FAMILY_LABEL[fam]) pendingCrowns.push(E.FAMILY_LABEL[fam]);
    }
    return true;
  }
  function checkBadges() {
    var fams = E.FAMILY_ORDER;
    for (var i = 0; i < fams.length; i++) {
      if (E.familyCoverage(S.cards, fams[i]) >= 0.999) giveBadge(fams[i] + '_master');
    }
    var commut = S.cards.filter(function (c) { return c.a !== c.b && (c.state === 'strong' || c.state === 'mastered'); }).length;
    if (commut >= 8) giveBadge('commutative_hero');
    if (S.stats.arraysCorrect >= 10) giveBadge('array_expert');
    if (S.rewards.stars >= 100) giveBadge('star_collector');
  }
  function updateStreakOnSession() {
    var wk = weekKeyOf(Date.now());
    if (S.streak.weekKey !== wk) { S.streak.weekKey = wk; S.streak.days = []; S.streak.shield = true; }
    var tk = todayKey();
    if (S.streak.days.indexOf(tk) < 0) { S.streak.days.push(tk); logEvent(EV.streak_updated, { daysThisWeek: S.streak.days.length }); }
  }

  /* ---------- grading bridge ---------- */
  function gradeAndPersist(cardId, opts) {
    var idx = -1; for (var i = 0; i < S.cards.length; i++) if (S.cards[i].id === cardId) { idx = i; break; }
    if (idx < 0) return null;
    var before = S.cards[idx];
    var after = E.gradeAttempt(before, opts);
    S.cards[idx] = after;
    logEvent(EV.fact_answered, { fact: cardId, correct: !!opts.correct, hint: !!opts.usedHint, transfer: !!opts.isTransfer, latencyMs: opts.latencyMs || 0 });
    if (opts.usedHint) logEvent(EV.hint_used, { fact: cardId });
    if (after.state === 'mastered' && before.state !== 'mastered') logEvent(EV.fact_mastered, { fact: cardId });
    if (after.state === 'at_risk' && before.state !== 'at_risk') logEvent(EV.lapse_detected, { fact: cardId });
    if (opts.correct) awardStars(opts.usedHint ? 1 : 2, 'answer');
    if (after.state === 'mastered' && before.state !== 'mastered') awardStars(5, 'mastery');
    // engagement tracking
    if (opts.correct) { bumpDaily(1, 0); bumpWeekly('correct', 1); }
    if (after.state === 'mastered' && before.state !== 'mastered') bumpWeekly('mastered', 1);
    checkBadges(); save();
    return { before: before, after: after };
  }

  /* ============================== ROUTER ============================== */
  var route = { name: 'boot', params: {} };
  function go(name, params) { route = { name: name, params: params || {} }; render(); }

  function render() {
    applyMotionPref();
    FX.clearTimers();
    // Profile management screens are always reachable (no active profile / no
    // consent required to pick or add a user).
    if (route.name === 'profiles') { return renderProfileSelect(); }
    if (route.name === 'profile_add') { startNewProfileDraft(); return renderProfile(); }
    // The parent gate must be reachable even with no active profile / no consent
    // yet (e.g. the "add user" flow launches it from the picker).
    if (route.name === 'parent_gate') { return renderParentGate(route.params.then || 'parent_dash'); }
    // Onboarding screens are always reachable.
    if (route.name === 'onb_gate' || route.name === 'onb_consent' || route.name === 'onb_profile') {
      return renderOnboarding();
    }
    if (!S.consentGiven) { return go('onb_gate'); }
    // Before baseline is done, only the baseline flow screens may run; anything
    // else funnels the child into the baseline intro.
    if (!S.baselineDone && route.name !== 'session' && route.name !== 'celebrate') {
      return renderBaselineIntro();
    }
    switch (route.name) {
      case 'home': return renderHome();
      case 'session': return renderSessionRunner();
      case 'celebrate': return renderCelebration(route.params);
      case 'daily_gift': return renderDailyGift();
      case 'game_arrays': return renderArraysGame();
      case 'game_train': return renderTrainGame();
      case 'game_balloons': return renderBalloonGame();
      case 'game_skip': return renderSkipGame();
      case 'games_hub': return renderGamesHub();
      case 'game_whack': return renderWhackGame();
      case 'game_shooter': return renderShooterGame();
      case 'game_memory': return renderMemoryGame();
      case 'game_runner': return renderRunnerGame();
      case 'game_duel': return renderDuelGame();
      case 'game_rhythm': return renderRhythmGame();
      case 'game_orchard': return renderOrchardGame();
      case 'practice_hub': return renderPracticeHub();
      case 'practice_add_h': return renderAddHoriz();
      case 'practice_add_v': return renderAddVert();
      case 'practice_word': return renderWordProblems();
      case 'shop': return renderShop();
      case 'garden_builder': return renderGardenBuilder();
      case 'world_map': return renderWorldMap();
      case 'land_story': return renderLandStory(route.params.fam);
      case 'trophies': return renderTrophies();
      case 'parent_gate': return renderParentGate(route.params.then || 'parent_dash');
      case 'parent_dash': return renderParentDashboard();
      case 'parent_settings': return renderSettings();
      case 'worksheet': return renderWorksheet();
      default: return renderHome();
    }
  }

  function topbar(showParent) {
    return '<div class="topbar">' +
      '<span class="pill"><span class="ic">⭐</span><span class="num">' + S.rewards.stars + '</span></span>' +
      '<span class="pill"><span class="ic">🔥</span><span class="num">' + S.streak.days.length + '</span><small>/5</small></span>' +
      (showParent ? '<button class="pill" id="toParent" aria-label="אזור הורים">👪 הורים</button>' : '<span></span>') +
      '</div>';
  }
  function FOX() {
    return '<svg class="fox float" viewBox="0 0 100 100" role="img" aria-label="שועלי המדריך">' +
      '<ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,.08)"/>' +
      '<path d="M22 30 L38 52 L20 52 Z" fill="#e8852f"/><path d="M78 30 L62 52 L80 52 Z" fill="#e8852f"/>' +
      '<circle cx="50" cy="58" r="30" fill="#f49b3f"/>' +
      '<path d="M50 40 a30 30 0 0 0 -28 18 a30 30 0 0 0 56 0 a30 30 0 0 0 -28 -18z" fill="#f7b15f"/>' +
      '<circle cx="40" cy="56" r="4.2" fill="#243b2e"/><circle cx="60" cy="56" r="4.2" fill="#243b2e"/>' +
      '<ellipse cx="50" cy="68" rx="14" ry="11" fill="#fff"/>' +
      '<circle cx="50" cy="66" r="3.6" fill="#243b2e"/><path d="M44 74 q6 5 12 0" stroke="#243b2e" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }

  /* ============================== ONBOARDING ============================== */
  function renderOnboarding() {
    switch (route.name) {
      case 'onb_gate': return renderParentGate('onb_consent', true);
      case 'onb_consent': return renderConsent();
      case 'onb_profile': return renderProfile();
      default: return renderParentGate('onb_consent', true);
    }
  }

  function renderConsent() {
    logEvent(EV.onboarding_started, {});
    app.innerHTML =
      '<div class="screen">' +
      FOX() +
      '<div class="card">' +
      '<h1 class="center">👑 גן הכפל של תמרי</h1>' +
      '<p class="center muted">אפליקציית הכפל של תמרי, אלופת העולם — בעברית.</p>' +
      '<h3>מה חשוב לדעת להורה</h3>' +
      '<p>כל המידע נשמר <b>רק במכשיר הזה</b>. אין חשבון, אין דוא"ל לילדה, אין פרסומות, אין צ\'אט ואין שיתוף לרשת.</p>' +
      '<p>איננו אוספים מצלמה, מיקרופון, מיקום, אנשי קשר או תמונות. נשמרים רק שם חיבה (לא שם אמיתי), בחירת דמות, וההתקדמות בלימוד — כדי להתאים את התרגול ולהציג לכם דוח.</p>' +
      '<p>תוכלו בכל רגע למחוק את כל הנתונים או לכבות איסוף סטטיסטיקה, באזור ההורים.</p>' +
      '<button class="btn btn-primary" id="agree">אני מאשר/ת וממשיכ/ה</button>' +
      '</div></div>';
    document.getElementById('agree').onclick = function () {
      S.consentGiven = true; save(); go('onb_profile');
    };
  }

  var AVATARS = ['👑', '🦊', '🐰', '🦉', '🦋', '🌟'];
  function renderProfile() {
    app.innerHTML =
      '<div class="screen">' +
      '<div class="card">' +
      '<h2 class="center">👑 ברוכה הבאה, אלופה!</h2>' +
      '<p class="center muted">השם שלך (אפשר לשנות):</p>' +
      '<input class="input" id="nick" maxlength="14" placeholder="למשל: כוכבת" value="' + (S.child.nickname || '') + '">' +
      '<div class="err-text" id="nickErr"></div>' +
      '<h3 class="center" style="margin-top:6px">בחרי דמות</h3>' +
      '<div class="grid2" id="avatars">' +
      AVATARS.map(function (a) { return '<div class="tile' + (S.child.avatar === a ? ' sel' : '') + '" tabindex="0" role="button" data-av="' + a + '" aria-label="דמות ' + a + '"><span class="emoji">' + a + '</span></div>'; }).join('') +
      '</div>' +
      '<button class="btn btn-primary" id="next" style="margin-top:14px">קדימה!</button>' +
      '</div></div>';
    var sel = S.child.avatar;
    function bindTile(t) {
      function choose() {
        sel = t.getAttribute('data-av'); S.child.avatar = sel;
        Array.prototype.forEach.call(app.querySelectorAll('.tile'), function (x) { x.classList.remove('sel'); });
        t.classList.add('sel');
      }
      t.onclick = choose; t.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } };
    }
    Array.prototype.forEach.call(app.querySelectorAll('.tile'), bindTile);
    document.getElementById('next').onclick = function () {
      var nick = document.getElementById('nick').value.trim();
      if (nick.length < 1) { document.getElementById('nickErr').textContent = 'צריך לבחור שם חיבה קצר'; return; }
      S.child.nickname = nick;
      if (!activeProfileId) {
        // First time for this child: create + activate the profile, then persist.
        var p = Storage.createProfile({ name: nick, avatar: S.child.avatar }, S);
        activeProfileId = p.id;
      } else {
        Storage.updateProfile(activeProfileId, { name: nick, avatar: S.child.avatar });
      }
      save();
      startBaseline();
    };
  }

  /* ============================== PROFILES (multi-user) ============================== */
  /* Start an in-memory draft for a brand-new profile (parent already gated).
   * Consent was given once for the device, so we carry it over. */
  function startNewProfileDraft() {
    activeProfileId = null;
    S = freshState();
    S.consentGiven = true;
  }

  function renderProfileSelect() {
    var profiles = Storage.listProfiles();
    app.innerHTML =
      '<div class="screen">' +
      '<div class="card">' +
      '<h2 class="center">מי משחק עכשיו?</h2>' +
      '<p class="center muted">בחרו פרופיל כדי להמשיך מאיפה שעצרתם.</p>' +
      '<div class="grid2" id="profiles">' +
      profiles.map(function (p) {
        return '<div class="tile" tabindex="0" role="button" data-id="' + escapeHtml(p.id) + '" aria-label="פרופיל ' + escapeHtml(p.name) + '">' +
          '<span class="emoji">' + escapeHtml(p.avatar || '👑') + '</span>' +
          '<span class="num" style="font-weight:800;margin-top:4px">' + escapeHtml(p.name) + '</span></div>';
      }).join('') +
      '</div>' +
      '<button class="btn btn-soft" id="addUser" style="margin-top:14px">➕ הוסף משתמש</button>' +
      '</div></div>';
    function pickProfile(id) {
      Storage.setActiveProfileId(id);
      activeProfileId = id;
      S = loadActiveState();
      save();
      go(S.consentGiven ? 'home' : 'onb_gate');
    }
    Array.prototype.forEach.call(app.querySelectorAll('.tile'), function (t) {
      function choose() { pickProfile(t.getAttribute('data-id')); }
      t.onclick = choose;
      t.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } };
    });
    // Adding a user is parent-gated so a child cannot spawn profiles at will.
    document.getElementById('addUser').onclick = function () { go('parent_gate', { then: 'profile_add' }); };
  }

  function renderBaselineIntro() {
    app.innerHTML =
      '<div class="screen">' + FOX() +
      '<div class="card center">' +
      '<h2>קדימה ' + NAME() + ', אלופה! 👑</h2>' +
      '<p class="muted">כמה תרגילים קצרים, רק כדי לדעת מאיפה מתחילות. אין טעויות — רק למידה.</p>' +
      '<button class="btn btn-primary" id="goBase">מתחילים</button>' +
      '</div></div>';
    document.getElementById('goBase').onclick = startBaseline;
  }

  /* ============================== SESSION ENGINE (UI) ============================== */
  var run = null; // active session runtime

  function pickEasyCard(excludeId) {
    var pool = S.cards.filter(function (c) { return (c.state === 'mastered' || c.state === 'strong') && c.id !== excludeId; });
    if (!pool.length) pool = S.cards.filter(function (c) { return c.state !== 'new' && c.b <= 3 && c.id !== excludeId; });
    if (!pool.length) pool = S.cards.filter(function (c) { return c.family === 'zeros' || c.family === 'ones'; });
    return pool.length ? pick(pool) : null;
  }
  function pickBonusCards(n) {
    var due = S.cards.filter(function (c) { return c.state !== 'new' && c.nextDueAt <= Date.now(); });
    var pool = due.length ? due : S.cards.filter(function (c) { return c.state === 'strong' || c.state === 'practicing'; });
    return shuffle(pool).slice(0, n);
  }
  // Adaptive pacing: ease after a struggle, gently extend on a hot streak.
  function adaptiveAfterAnswer(correct, fast, usedHint) {
    if (!run || run.mode === 'baseline') return;
    if (correct) { run.consecWrong = 0; run.fastCorrect = (fast && !usedHint) ? run.fastCorrect + 1 : 0; }
    else { run.consecWrong++; run.fastCorrect = 0; }
    if (run.consecWrong >= 3 && !run.eased) {
      run.eased = true;
      var cur = run.items[run.i] && run.items[run.i].card ? run.items[run.i].card.id : null;
      var easy = pickEasyCard(cur);
      if (easy) { var it = buildItem(easy, false); it.scaffold = false; it.freeEntry = false; it.ease = true; run.items.splice(run.i + 1, 0, it); }
      run.endAfterEase = true;
    }
    if (run.fastCorrect >= 4 && !run.boosted && (run.items.length - (run.i + 1)) <= 1) {
      run.boosted = true;
      pickBonusCards(2).forEach(function (c) { var bi = buildItem(c, false); bi.bonus = true; run.items.push(bi); });
    }
  }
  function choicesHTML(item) {
    return '<div class="choices" id="choices" role="group" aria-label="בחרי תשובה">' +
      item.choices.map(function (v) { return '<button class="choice" data-v="' + v + '"><span class="num">' + v + '</span></button>'; }).join('') +
      '</div>';
  }
  function keypadHTML() {
    var keys = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (d) { keys += '<button class="kp" data-d="' + d + '">' + d + '</button>'; });
    keys += '<button class="kp kp-del" data-act="del" aria-label="מחק">⌫</button>';
    keys += '<button class="kp" data-d="0">0</button>';
    keys += '<button class="kp kp-ok" data-act="ok" aria-label="אישור">✓</button>';
    return '<div class="keypad-disp num" id="kpDisp" aria-live="polite">·</div><div class="keypad" id="keypad">' + keys + '</div>';
  }

  function buildItem(card, forceTransfer) {
    var scaffold = E.chooseScaffold(card);
    var wantTransfer = forceTransfer || (card.state === 'strong' && card.transferSuccess === 0);
    var a = card.a, b = card.b, p = card.product;
    if (wantTransfer && card.state !== 'new') {
      var kind = pick(['missing', 'inverse', 'word']);
      if (kind === 'missing') {
        var hideB = Math.random() < 0.5;
        var shown = hideB ? a : b, ans = hideB ? b : a;
        return { card: card, isTransfer: true, scaffold: false, kind: kind,
          promptHTML: 'מהו המספר החסר?<div class="prompt-q">' + mexpr((hideB ? a + ' × ?' : '? × ' + b) + ' = ' + p) + '</div>',
          speak: 'מהו המספר החסר?', answer: ans, choices: operandChoices(ans),
          hintText: 'איזה מספר כפול ' + shown + ' נותן ' + p + '?' };
      }
      if (kind === 'inverse') {
        var hb = Math.random() < 0.5; var divisor = hb ? a : b, quo = hb ? b : a;
        return { card: card, isTransfer: true, scaffold: false, kind: kind,
          promptHTML: 'חילוק — ההיפוך של כפל:<div class="prompt-q">' + mexpr(p + ' ÷ ' + divisor + ' = ?') + '</div>',
          speak: 'כמה זה ' + p + ' חלקי ' + divisor + '?', answer: quo, choices: operandChoices(quo),
          hintText: 'כמה קבוצות של ' + divisor + ' צריך כדי להגיע ל-' + p + '?' };
      }
      var tpl = pick(C.wordTemplates);
      return { card: card, isTransfer: true, scaffold: false, kind: 'word',
        promptHTML: '<div style="font-size:20px;font-weight:700">' + tpl(a, b) + '</div>',
        speak: 'בעיה מילולית.', answer: p, choices: productChoices(p, a, b),
        hintText: 'זה ' + a + ' קבוצות של ' + b + '.' };
    }
    // direct fact
    var freeEntry = !scaffold && S.settings.freeEntry && (card.state === 'strong' || card.state === 'mastered');
    return { card: card, isTransfer: false, scaffold: scaffold, kind: 'direct', freeEntry: freeEntry,
      promptHTML: 'כמה זה?<div class="prompt-q">' + mexpr(a + ' × ' + b) + '</div>' +
        (scaffold ? '<div class="center" style="margin-top:6px">' + arrayDots(a, b) + '<p class="muted">' + a + ' שורות של ' + b + '. ' + C.hintByFamily[card.family] + '</p></div>' : ''),
      speak: 'כמה זה ' + a + ' כפול ' + b + '?', answer: p, choices: productChoices(p, a, b),
      hintText: C.hintByFamily[card.family] };
  }

  function startBaseline() {
    var fams = ['zeros', 'ones', 'twos', 'tens', 'fives'];
    var picks = [];
    fams.forEach(function (f) {
      var pool = S.cards.filter(function (c) { return c.family === f && c.b >= 2; });
      if (pool.length) picks.push(pick(pool));
    });
    run = { mode: 'baseline', items: picks.map(function (c) { return buildItem(c, false); }), i: 0, correct: 0, stars0: S.rewards.stars, t0: Date.now(),
            consecWrong: 0, fastCorrect: 0, eased: false, boosted: false, endNow: false };
    go('session');
  }

  function startSession(mode) {
    var session = E.buildSession(S.cards, { now: Date.now(), length: S.settings.sessionLength });
    var items = [];
    var introFam = E.activeIntroFamily(S.cards);
    var hasFresh = session.some(function (it) { return it.pool === 'fresh'; });
    if (mode === 'daily' && introFam && hasFresh) {
      items.push({ kind: 'concept', family: introFam, concept: C.concept[introFam] });
    }
    session.forEach(function (it) { items.push(buildItem(it.card, false)); });
    if (!items.length) { // nothing due: gentle free practice
      var any = shuffle(S.cards.filter(function (c) { return c.state !== 'new'; })).slice(0, S.settings.sessionLength);
      if (!any.length) any = shuffle(S.cards.filter(function (c) { return c.family === 'zeros' || c.family === 'ones'; })).slice(0, 5);
      any.forEach(function (c) { items.push(buildItem(c, false)); });
    }
    run = { mode: mode, items: items, i: 0, correct: 0, stars0: S.rewards.stars, t0: Date.now(),
            consecWrong: 0, fastCorrect: 0, eased: false, boosted: false, endNow: false };
    logEvent(mode === 'review' ? EV.review_started : EV.lesson_started, { count: items.length });
    go('session');
  }

  function renderSessionRunner() {
    if (run && run.endNow) return finishSession();
    if (!run || run.i >= run.items.length) return finishSession();
    var item = run.items[run.i];
    var total = run.items.length, pct = Math.round((run.i) / total * 100);

    if (item.kind === 'concept') {
      app.innerHTML = '<div class="screen">' + topbar(false) +
        '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        '<div class="card center" style="margin-top:14px">' + FOX() +
        '<p style="font-weight:800;color:var(--leaf-dark)">' + NAME() + ', בואי נלמד יחד 👑</p>' +
        '<h2>' + item.concept.title + '</h2>' +
        item.concept.lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') +
        '<div class="center">' + arrayDots(2, 4, 'berry') + '</div>' +
        '<button class="btn btn-sun btn-sm" id="say" style="width:auto;margin:8px auto 0">🔊 שמע שוב</button>' +
        '<button class="btn btn-primary" id="next" style="margin-top:12px">הבנתי, ממשיכים!</button>' +
        '</div></div>';
      var line = NAME() + ', בואי נלמד ' + item.concept.title + '. ' + item.concept.lines.join(' ');
      speak(line);
      document.getElementById('say').onclick = function () { speak(line); };
      document.getElementById('next').onclick = function () { run.i++; render(); };
      return;
    }

    var state = { hintUsed: !!item.scaffold, answered: false, t0: Date.now() };
    var banner = item.ease ? '<div class="note-ease">בואי נסיים בניצחון, ' + escapeHtml(NAME()) + ' 💛</div>'
      : item.bonus ? '<div class="note-bonus">⭐ סבב בונוס, ' + escapeHtml(NAME()) + '!</div>' : '';
    var answerUI = item.freeEntry ? keypadHTML() : choicesHTML(item);

    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
      '<div class="card" style="margin-top:14px">' + banner +
      '<div class="center muted" style="font-size:15px">תרגיל ' + (run.i + 1) + ' מתוך ' + total + (item.freeEntry ? ' · הקלידי את התשובה' : '') + '</div>' +
      '<div style="text-align:center">' + item.promptHTML + '</div>' +
      answerUI +
      '<div class="feedback" id="fb" aria-live="assertive"></div>' +
      '<div class="btn-row" style="margin-top:6px">' +
      '<button class="btn btn-soft btn-sm" id="hint">💡 רמז</button>' +
      '<button class="btn btn-sun btn-sm" id="say">🔊 שמע שוב</button>' +
      '</div></div></div>';

    speak(item.speak);
    document.getElementById('say').onclick = function () { speak(item.speak); };
    document.getElementById('hint').onclick = function () {
      state.hintUsed = true;
      var fb = document.getElementById('fb'); fb.className = 'feedback'; fb.textContent = item.hintText;
      speak(item.hintText);
      if (!document.getElementById('scaf') && item.kind === 'direct') {
        var holder = document.createElement('div'); holder.id = 'scaf'; holder.className = 'center'; holder.style.marginTop = '10px';
        holder.innerHTML = arrayDots(item.card.a, item.card.b);
        document.getElementById('fb').after(holder);
      }
    };

    function finishAnswer(correct, picked, latency) {
      var fb = document.getElementById('fb');
      if (correct) {
        if (run.mode !== 'baseline') run.correct++;
        var msg = (!state.hintUsed && latency < 3500) ? cheer(CHAMP.successIndep) : cheer(CHAMP.success);
        fb.className = 'feedback good'; fb.textContent = msg; speak(msg);
        FX.sfx('correct'); FX.burstAt(fb, '#3aa76d', 12);
        gradeAndPersist(item.card.id, { correct: true, usedHint: state.hintUsed, latencyMs: latency, isTransfer: item.isTransfer, now: Date.now() });
      } else {
        fb.className = 'feedback bad'; var em = cheer(CHAMP.error); fb.textContent = em; speak(em + ' התשובה היא ' + item.answer);
        FX.sfx('wrong'); FX.shake();
        if (item.kind === 'direct' && typeof picked === 'number') recordError(item.card, picked);
        gradeAndPersist(item.card.id, { correct: false, usedHint: state.hintUsed, latencyMs: latency, isTransfer: item.isTransfer, now: Date.now() });
      }
      adaptiveAfterAnswer(correct, latency < 2500, state.hintUsed);
      if (item.ease && run.endAfterEase) run.endNow = true;
      setTimeout(function () { run.i++; render(); }, correct ? 850 : 1500);
    }

    if (item.freeEntry) {
      var buf = '';
      var disp = document.getElementById('kpDisp');
      function refresh() { disp.textContent = buf.length ? buf : '·'; }
      Array.prototype.forEach.call(app.querySelectorAll('.kp'), function (k) {
        k.onclick = function () {
          if (state.answered) return;
          var d = k.getAttribute('data-d'), act = k.getAttribute('data-act');
          if (d != null) { if (buf.length < 3) { buf += d; refresh(); } return; }
          if (act === 'del') { buf = buf.slice(0, -1); refresh(); return; }
          if (act === 'ok') {
            if (!buf.length) return; state.answered = true;
            var picked = Number(buf), correct = picked === item.answer, latency = Date.now() - state.t0;
            disp.style.color = correct ? 'var(--good)' : 'var(--bad)';
            finishAnswer(correct, picked, latency);
          }
        };
      });
    } else {
      Array.prototype.forEach.call(app.querySelectorAll('.choice'), function (btn) {
        btn.onclick = function () {
          if (state.answered) return; state.answered = true;
          var v = Number(btn.getAttribute('data-v'));
          var correct = v === item.answer, latency = Date.now() - state.t0;
          btn.classList.add(correct ? 'correct' : 'wrong');
          if (!correct) { var cb = app.querySelector('.choice[data-v="' + item.answer + '"]'); if (cb) cb.classList.add('correct'); }
          finishAnswer(correct, v, latency);
        };
      });
    }
  }

  function recordHistory() {
    var k = E.computeKpis(S.cards);
    var entry = { date: todayKey(), masteryPct: k.masteryPct, accuracy: k.mixedReviewAccuracy,
                  minutes: Math.round(S.stats.totalTimeMs / 60000), ts: Date.now() };
    var last = S.history[S.history.length - 1];
    if (last && last.date === entry.date) S.history[S.history.length - 1] = entry;
    else S.history.push(entry);
    if (S.history.length > 180) S.history.splice(0, S.history.length - 180);
  }

  /* Go to a celebration, but if a champion rank was just crossed, upgrade it
   * into a big level-up moment instead. */
  function celebrate(params) {
    var lu = popLevelUp();
    if (lu) {
      params = Object.assign({}, params, {
        title: '🎉 עלית דרגה!',
        sub: NAME() + ', הגעת לדרגת ' + lu.emoji + ' ' + lu.name + '! ' + cheer(CHAMP.affirm),
        rank: lu,
        then: params.then || 'home'
      });
    }
    go('celebrate', params);
  }

  function finishSession() {
    var mode = run ? run.mode : 'daily';
    var correct = run ? run.correct : 0, total = run ? run.items.filter(function (x) { return x.kind !== 'concept'; }).length : 0;
    var earned = S.rewards.stars - (run ? run.stars0 : S.rewards.stars);
    var dt = Date.now() - (run ? run.t0 : Date.now());
    var bossFam = run ? run.family : null;
    if (mode === 'baseline') {
      S.baselineDone = true; logEvent(EV.baseline_completed, { correct: correct });
      logEvent(EV.onboarding_completed, {}); save();
      go('celebrate', { title: '👑 כל הכבוד ' + NAME() + '!', sub: 'סיימת את ההיכרות, אלופה. מוכנה לכבוש את הכפל?', earned: earned, then: 'home' });
      run = null; return;
    }
    S.stats.sessionsCompleted++; S.stats.totalTimeMs += dt; S.stats.lastSessionAt = Date.now();
    updateStreakOnSession();
    bumpDaily(0, 1); bumpWeekly('sessions', 1); setRecord('bestSessionCorrect', correct);
    if (S.stats.sessionsCompleted === 1) giveBadge('first_lesson');
    checkBadges(); recordHistory(); bumpChest(1); save();
    try { Storage.autoBackup(activeProfileId, S); } catch (e) {} // daily durable snapshot
    logEvent(mode === 'review' ? EV.review_completed : EV.lesson_completed, { correct: correct, total: total, ms: dt, boss: bossFam || undefined });
    run = null;

    if (mode === 'boss' && bossFam) {
      var acc = total ? correct / total : 0;
      if (acc >= 0.8) {
        if (S.rewards.bossDone.indexOf(bossFam) < 0) { S.rewards.bossDone.push(bossFam); awardStars(10, 'boss'); }
        pendingCrowns = []; save();
        celebrate({ title: '👑 אלופת ' + E.FAMILY_LABEL[bossFam] + '!', sub: NAME() + ', ניצחת את האתגר עם ' + correct + '/' + total + '! 🌍🏆', earned: earned, then: 'home' });
        return;
      }
      go('celebrate', { title: 'כמעט, ' + NAME() + '! 💪', sub: 'אלופות מתאמנות ומנצחות. עוד ניסיון לאתגר ' + E.FAMILY_LABEL[bossFam] + '?', earned: earned, then: 'home' });
      return;
    }

    var sub = 'ענית נכון על ' + correct + ' מתוך ' + total + ', ' + NAME() + '. ' + cheer(CHAMP.affirm);
    var title = '👑 ' + NAME() + ' אלופה!';
    if (pendingCrowns.length) {
      title = '👑 הוכתרת ל' + pendingCrowns[0] + '!';
      sub = NAME() + ', שלטת בכל ' + pendingCrowns.join(' וגם ') + ' — את אלופת העולם! 🌍';
      pendingCrowns = [];
    }
    celebrate({ title: title, sub: sub, earned: earned, then: 'home' });
  }

  function renderCelebration(p) {
    var rank = p.rank;
    var rankHTML = rank ? '<div class="rank-up" aria-label="דרגה חדשה">' +
      '<div class="rank-emoji">' + rank.emoji + '</div>' +
      '<div class="rank-name">' + rank.name + '</div>' +
      (rank.isMax ? '<small class="muted">הדרגה הגבוהה ביותר! 🌍</small>'
                  : '<small class="muted">הדרגה הבאה: ' + rank.next.emoji + ' ' + rank.next.name + '</small>') +
      '</div>' : '';
    app.innerHTML = '<div class="screen center">' +
      '<div class="stars-burst">🌟✨🌟</div>' +
      '<div class="card' + (rank ? ' levelup' : '') + '">' +
      '<h1>' + (p.title || 'כל הכבוד!') + '</h1>' +
      rankHTML +
      '<p class="muted">' + (p.sub || '') + '</p>' +
      (p.earned > 0 ? '<p style="font-size:22px;font-weight:800">+<span class="num">' + p.earned + '</span> ⭐</p>' : '') +
      '<button class="btn btn-primary" id="ok">המשך</button>' +
      '<button class="link" id="skip">דלג</button>' +
      '</div></div>';
    speak((p.title || '') + ' ' + (p.sub || ''));
    try {
      FX.sfx('win'); var sb = app.querySelector('.stars-burst'); FX.burstAt(sb, '#ffd23f', 22);
      if (rank) confettiRain(rank.isMax ? 90 : 60); // extra celebration on level-up
    } catch (e) {}
    document.getElementById('ok').onclick = function () { go(p.then || 'home'); };
    document.getElementById('skip').onclick = function () { go(p.then || 'home'); };
  }

  /* A fuller confetti shower for big moments (level-up). Respects reduced-motion
   * and is a no-op without the fx layer. Built on the same particle system. */
  function confettiRain(n) {
    if (document.body.classList.contains('reduced')) return;
    var host = document.getElementById('fx-layer'); if (!host) return;
    var colors = ['#ffd23f', '#3aa76d', '#3775D6', '#ff7aa2', '#a06bd6', '#ff9f43'];
    var w = window.innerWidth || 360;
    for (var i = 0; i < (n || 60); i++) {
      (function (i) {
        var delay = Math.random() * 500;
        FX.addTimer(setTimeout(function () {
          var p = document.createElement('span'); p.className = 'confetti';
          p.style.left = Math.random() * w + 'px';
          p.style.background = colors[i % colors.length];
          p.style.setProperty('--cx', (Math.random() * 80 - 40) + 'px');
          p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
          host.appendChild(p);
          FX.addTimer(setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1700));
        }, delay));
      })(i);
    }
  }

  /* Daily-gift calendar shown once per day on the first open. */
  function renderDailyGift() {
    var day = S.login.streakDays || 1;
    var reward = (typeof S.login.lastReward === 'number') ? S.login.lastReward : E.loginRewardForDay(day);
    var cyclePos = ((day - 1) % 7) + 1;
    var cells = '';
    for (var i = 1; i <= 7; i++) {
      var cls = 'gift-cell' + (i < cyclePos ? ' got' : '') + (i === cyclePos ? ' today' : '');
      cells += '<div class="' + cls + '"><small>יום ' + i + '</small><span class="gc-em">' + (i <= cyclePos ? '⭐' : '🎁') + '</span><b>' + E.loginRewardForDay(i) + '</b></div>';
    }
    app.innerHTML = '<div class="screen center">' +
      '<div class="stars-burst">🎁✨🎁</div>' +
      '<div class="card levelup">' +
      '<h1>מתנת היומית! 🎁</h1>' +
      '<p class="muted">' + escapeHtml(NAME()) + ', התחברת ' + day + ' ימים ברצף — קבלי <b>' + reward + ' ⭐</b>!</p>' +
      '<div class="gift-row">' + cells + '</div>' +
      '<button class="btn btn-primary" id="claim">קחי את המתנה</button>' +
      '</div></div>';
    speak('מתנה יומית! קיבלת ' + reward + ' כוכבים.');
    try { FX.sfx('win'); confettiRain(50); } catch (e) {}
    bindBtn('claim', function () { go('home'); });
  }

  /* ============================== HOME ============================== */
  function renderHome() {
    logEvent(EV.app_open, {});
    var k = E.computeKpis(S.cards);
    var rank = E.rankForCards(S.cards);
    var rankPct = rank.isMax ? 100 : Math.round(rank.progressToNext * 100);
    var introFam = E.activeIntroFamily(S.cards);
    var nextLabel = introFam ? E.FAMILY_LABEL[introFam] : 'חזרה ושימור';
    var dueCount = S.cards.filter(function (c) { return c.state !== 'new' && c.nextDueAt <= Date.now(); }).length;
    var bossFam = null;
    for (var bi = 0; bi < E.FAMILY_ORDER.length; bi++) {
      var bf = E.FAMILY_ORDER[bi];
      if (E.familyReadyForBoss(S.cards, bf) && S.rewards.bossDone.indexOf(bf) < 0) { bossFam = bf; break; }
    }
    var gardenRow = E.FAMILY_ORDER.map(function (f) {
      var cov = E.familyCoverage(S.cards, f);
      return cov >= 0.999 ? '🌷' : cov >= 0.5 ? '🌿' : cov > 0 ? '🌱' : '·';
    }).join(' ');

    var familyNodes = E.FAMILY_ORDER.map(function (f) {
      var cov = E.familyCoverage(S.cards, f);
      var unlocked = E.familyUnlocked(S.cards, f);
      var cls = cov >= 0.999 ? 'done' : (f === introFam ? 'active' : '');
      var ic = cov >= 0.999 ? '✅' : (unlocked ? '🌟' : '🔒');
      return '<div class="node ' + cls + '"><span class="badge-ic">' + ic + '</span>' +
        '<div class="meta"><b>' + E.FAMILY_LABEL[f] + '</b><br><small>' + Math.round(cov * 100) + '% נלמד</small></div></div>';
    }).join('');

    var accHtml = (S.child.accessories || []).map(function (a) { return '<span style="font-size:24px">' + a + '</span>'; }).join('');
    var petGlyphs = Object.keys(S.collection.pets || {}).map(function (key) { var st = S.collection.pets[key].stage || 0; return st >= 2 ? key : ['🥚', '🐣', key][st]; });
    var gardenMini = (S.garden.placed || []).slice(0, 14).map(function (pl) { return pl.key; }).join(' ');

    // engagement: daily goal, streak flame, weekly challenge, buddy
    var todayK = todayKey();
    var dailyCorrect = (S.daily.dateKey === todayK) ? S.daily.correct : 0;
    var goalPct = Math.min(100, Math.round(dailyCorrect / DAILY_GOAL * 100));
    var streakFlame = S.streak.days.length;
    var wk = weekKeyOf(Date.now());
    var ch = E.pickWeeklyChallenge(wk);
    var wprog = (S.weekly.weekKey === wk) ? S.weekly.progress : 0;
    var wdone = (S.weekly.weekKey === wk) ? S.weekly.done : false;
    var wpct = Math.min(100, Math.round(wprog / ch.target * 100));
    var buddyKey = S.collection.buddy;

    app.innerHTML = '<div class="screen">' + topbar(true) +
      '<div class="card" style="background:linear-gradient(135deg,#ffffff,#fff7d9);border:2px solid var(--sun)">' +
      '<div style="display:flex;align-items:center;gap:14px">' +
      '<div style="font-size:54px;position:relative">' + S.child.avatar + (accHtml ? '<div style="position:absolute;top:-6px;inset-inline-end:-8px;display:flex;gap:2px">' + accHtml + '</div>' : '') + '</div>' +
      '<div style="flex:1"><h2 style="margin:0">👑 ' + escapeHtml(NAME()) + ' אלופת העולם</h2>' +
      '<small class="muted">' + cheer(CHAMP.affirm) + '</small>' +
      (buddyKey ? '<div class="buddy-line"><span class="buddy-glyph">' + buddyGlyph(buddyKey) + '</span> <span class="muted">' + buddyReaction(dailyCorrect) + '</span></div>' : '') +
      '</div></div>' +
      '<div style="margin-top:12px">' +
      '<div class="rank-chip"><span class="rc-emoji">' + rank.emoji + '</span>' +
      '<div style="flex:1"><b>דרגה: ' + rank.name + '</b>' +
      '<div class="progress" style="margin-top:6px"><i style="width:' + Math.max(3, rankPct) + '%"></i></div>' +
      '<small class="muted">' + (rank.isMax
        ? ('שיא! ' + Math.round(k.masteryPct * 100) + '% מהכפל בשליטה 🌍')
        : ('עוד ' + (100 - rankPct) + '% לדרגת ' + rank.next.emoji + ' ' + rank.next.name)) + '</small>' +
      '</div></div>' +
      '<small class="muted" style="display:block;margin-top:6px">היעד הבא בלימוד: ' + nextLabel +
      ' · ' + Math.round(k.masteryPct * 100) + '% מהכפל בשליטה</small></div></div>' +

      '<div class="card daily-card"><div class="row between"><h3 style="margin:0">🎯 היעד היומי</h3>' +
      '<span class="flame' + (streakFlame > 0 ? ' lit' : '') + '">🔥 <span class="num">' + streakFlame + '</span><small>/5</small></span></div>' +
      '<div class="goal-wrap">' + ringSVG(goalPct, dailyCorrect + '/' + DAILY_GOAL) +
      '<div><b>' + dailyCorrect + ' מתוך ' + DAILY_GOAL + ' תשובות נכונות היום</b><br>' +
      '<small class="muted">' + (S.daily.goalMet ? 'היעד הושג, אלופה! 🌟 +5⭐' : 'עוד ' + Math.max(0, DAILY_GOAL - dailyCorrect) + ' להשלמת היעד') + '</small></div>' +
      '</div></div>' +

      '<div class="card"><div class="row between"><h3 style="margin:0">' + ch.emoji + ' אתגר השבוע</h3>' + (wdone ? '<span class="pill">✅ הושלם</span>' : '') + '</div>' +
      '<p class="muted" style="margin:4px 0">' + ch.label + '</p>' +
      '<div class="progress"><i style="width:' + Math.max(3, wpct) + '%"></i></div>' +
      '<small class="muted">' + Math.min(wprog, ch.target) + '/' + ch.target + ' · שיא אישי בסבב: ' + (S.records.bestSessionCorrect || 0) + ' נכון</small></div>' +

      (S.rewards.chests > 0 ? '<div class="card" style="background:linear-gradient(135deg,#fff,#ffe9c9);border:2px solid var(--sun-dark)"><div class="row between"><h3 style="margin:0">🎁 יש לך תיבת אוצר!</h3><button class="btn btn-sun btn-sm" id="homeChest" style="width:auto">פתחי (' + S.rewards.chests + ')</button></div></div>' : '') +

      '<div class="card">' +
      '<button class="btn btn-primary" id="daily">▶️ המשימה של היום</button>' +
      '<div class="btn-row" style="margin-top:10px">' +
      '<button class="btn btn-sun btn-sm" id="review">🔁 חזרה' + (dueCount ? ' (' + dueCount + ')' : '') + '</button>' +
      '<button class="btn btn-soft btn-sm" id="shop">🧸 חנות הצעצועים</button>' +
      '</div></div>' +

      (bossFam ? '<div class="card" style="background:linear-gradient(135deg,#fff,#ffe9c9);border:2px solid var(--sun-dark)">' +
        '<h3 style="margin:0">🏆 אתגר אלופה!</h3>' +
        '<p class="muted">' + escapeHtml(NAME()) + ', את ממש קרובה. נצחי את האתגר וקבלי כתר ' + E.FAMILY_LABEL[bossFam] + '.</p>' +
        '<button class="btn btn-sun" id="boss">👑 קדימה לאתגר ' + E.FAMILY_LABEL[bossFam] + '</button></div>' : '') +

      '<div class="card"><div class="row between"><h3 style="margin:0">הגינה שלי 🌷</h3><button class="link" id="toBuilder2">בנה/סדר</button></div>' +
      (gardenMini ? '<div style="font-size:24px;direction:ltr;text-align:center;line-height:1.6">' + gardenMini + '</div>' : '<div style="font-size:26px;letter-spacing:4px;direction:ltr;text-align:center">' + gardenRow + '</div>') +
      (petGlyphs.length ? '<div style="font-size:26px;direction:ltr;text-align:center;margin-top:4px">' + petGlyphs.join(' ') + '</div>' : '') +
      '<small class="muted">הגינה של ' + escapeHtml(NAME()) + ' פורחת ככל שהיא שולטת — וגם עם מה שקנית בחנות.</small></div>' +

      '<div class="card"><h3>משחקים 🎮</h3>' +
      '<p class="muted">אחד-עשר משחקים — אקשן, זיכרון, מערכים ועוד.</p>' +
      '<button class="btn btn-sun" id="toGames">🎮 כל המשחקים</button></div>' +

      '<div class="card"><h3>מרכז התרגול 📝</h3>' +
      '<p class="muted">חיבור עד 100 (במאוזן ובמאונך) ושאלות מילוליות — כפל וחיבור.</p>' +
      '<button class="btn btn-soft" id="toPractice">📝 לתרגול</button></div>' +

      '<div class="card"><div class="row between"><h3 style="margin:0">🏆 חדר הגביעים</h3><button class="btn btn-soft btn-sm" id="toTrophies" style="width:auto">לחדר</button></div>' +
      '<p class="muted">תגים, כתרים, אוספים והבן-לוויה שלך.</p></div>' +

      '<div class="card"><div class="row between"><h3 style="margin:0">🗺️ המסע שלי</h3><button class="btn btn-soft btn-sm" id="toMap" style="width:auto">למפה</button></div>' +
      '<div class="map">' + familyNodes + '</div></div>' +
      '</div>';

    document.getElementById('daily').onclick = function () { startSession('daily'); };
    document.getElementById('review').onclick = function () { startSession('review'); };
    document.getElementById('shop').onclick = function () { shopTab = 'pets'; go('shop'); };
    bindBtn('toMap', function () { go('world_map'); });
    bindBtn('toBuilder2', function () { go('garden_builder'); });
    if (S.rewards.chests > 0) bindBtn('homeChest', function () { var r = openChest(); FX.sfx('coin'); go('celebrate', { title: '🎁 תיבת אוצר!', sub: r ? ('זכית ב' + r.label + ' ' + r.key) : 'מצוין!', earned: 0, then: 'home' }); });
    if (bossFam) bindBtn('boss', function () { startBoss(bossFam); });
    bindBtn('toGames', function () { go('games_hub'); });
    bindBtn('toPractice', function () { go('practice_hub'); });
    bindBtn('toTrophies', function () { go('trophies'); });
    document.getElementById('toParent').onclick = function () { go('parent_gate', { then: 'parent_dash' }); };
  }
  function bindBtn(id, fn) {
    var el = document.getElementById(id); if (!el) return;
    el.onclick = fn; el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function starsHTML(filled) {
    var s = '';
    for (var i = 0; i < 3; i++) s += '<span class="' + (i < filled ? '' : 'off') + '">★</span>';
    return '<span class="stars" aria-label="' + filled + ' מתוך 3 כוכבים">' + s + '</span>';
  }
  function ringSVG(pct, label) {
    var r = 26, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<svg class="goal-ring" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="#e7eee7" stroke-width="7"/>' +
      '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="var(--leaf)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 32 32)"/>' +
      '<text x="32" y="37" text-anchor="middle" font-size="14" font-weight="800" fill="var(--leaf-dark)">' + label + '</text></svg>';
  }
  function buddyGlyph(key) { return petGlyph(key) || key; }
  function buddyReaction(correct) {
    var bank = correct >= DAILY_GOAL ? ['וואו, השלמת את היעד! 🎉', 'את אלופה אמיתית!']
      : correct > 0 ? ['יאללה, ממשיכים!', 'כל הכבוד, עוד קצת!', 'אני גאה בך!']
        : ['בואי נתרגל היום יחד!', 'מוכנה למשימה? קדימה!'];
    return pick(bank);
  }

  function startBoss(fam) {
    var cards = S.cards.filter(function (c) { return c.family === fam; });
    if (!cards.length) return;
    var items = shuffle(cards.slice()).map(function (c, idx) { return buildItem(c, idx % 3 === 0); });
    run = { mode: 'boss', family: fam, items: items, i: 0, correct: 0, stars0: S.rewards.stars, t0: Date.now(),
            consecWrong: 0, fastCorrect: 0, eased: false, boosted: false, endNow: false };
    logEvent('boss_started', { family: fam });
    go('session');
  }

  /* ============================== GAME 1: GARDEN ARRAYS ==============================
   * Learning outcome: multiplication as arrays / equal rows×cols (meaning of ×). */
  function gamePickFact() {
    var now = Date.now();
    var atRisk = S.cards.filter(function (c) { return c.state === 'at_risk'; });
    var due = S.cards.filter(function (c) { return c.state !== 'new' && c.nextDueAt <= now && c.b >= 2; });
    var prac = S.cards.filter(function (c) { return c.state === 'practicing' && c.b >= 2; });
    var any = S.cards.filter(function (c) { return c.state !== 'new' && c.b >= 2; });
    var pool = atRisk.length ? atRisk : due.length ? due : prac.length ? prac : any.length ? any
      : S.cards.filter(function (c) { return c.b >= 2 && c.b <= 5; });
    return pick(pool);
  }

  /* ============================== GAME 4: SKIP COUNTING ("קפיצות בגינה") ==============================
   * Learning outcome: skip-counting fluency that underpins the ×2/×3/×4/×5/×10 families. */
  function renderSkipGame() {
    if (!run || run.game !== 'skip') { run = { game: 'skip', round: 0, n: 3, correct: 0, stars0: S.rewards.stars }; logEvent(EV.game_started, { game: 'skip' }); }
    if (run.round >= run.n) return finishGame('🦘 קפיצות בגינה');
    var introFam = E.activeIntroFamily(S.cards);
    var map = { fives: 5, threes: 3, fours: 4, twos: 2, tens: 10, sixes: 6, nines: 9 };
    var m = map[introFam] || pick([2, 3, 4, 5, 10]);
    var k = 6, targets = [];
    for (var i = 1; i <= k; i++) targets.push(m * i);
    var distract = [m * (k + 1), m + 1, m * 2 - 1].filter(function (x) { return targets.indexOf(x) < 0; });
    var opts = shuffle(targets.concat(distract.slice(0, 2)));
    var expected = 1;
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center"><h3>קפיצות של ' + m + ' 🦘</h3>' +
      '<p class="muted">לחצי לפי הסדר: ' + m + ', ' + (2 * m) + ', ' + (3 * m) + ' ...</p>' +
      '<div class="skip-grid" id="skip">' +
      opts.map(function (v) { return '<button class="skip-cell" data-v="' + v + '"><span class="num">' + v + '</span></button>'; }).join('') +
      '</div><div class="feedback" id="fb"></div>' +
      '<button class="btn btn-soft btn-sm" id="say" style="width:auto;margin:8px auto 0">🔊 שמע</button>' +
      '</div></div>';
    speak('קפיצות של ' + m + '. לחצי לפי הסדר.');
    document.getElementById('say').onclick = function () { speak('הבא בתור: ' + (m * expected)); };
    Array.prototype.forEach.call(app.querySelectorAll('.skip-cell'), function (btn) {
      btn.onclick = function () {
        if (btn.classList.contains('done')) return;
        var v = Number(btn.getAttribute('data-v'));
        var fb = document.getElementById('fb');
        if (v === m * expected) {
          btn.classList.add('done');
          gradeAndPersist(E.factId(m, expected), { correct: true, usedHint: false, latencyMs: 1800, now: Date.now() });
          expected++;
          if (expected > k) { run.correct++; run.round++; fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success); speak(fb.textContent); save(); setTimeout(function () { render(); }, 700); }
        } else {
          btn.classList.add('shake'); fb.className = 'feedback bad'; fb.textContent = 'הבא בתור: ' + (m * expected);
          setTimeout(function () { btn.classList.remove('shake'); }, 400);
        }
      };
    });
  }

  function renderArraysGame() {
    if (!run || run.game !== 'arrays') { run = { game: 'arrays', i: 0, n: 5, correct: 0, stars0: S.rewards.stars }; logEvent(EV.game_started, { game: 'arrays' }); }
    if (run.i >= run.n) return finishGame('🌱 גינת המערכים');
    var c = gamePickFact(); var a = c.a, b = c.b;
    var options = [{ r: a, k: b, ok: true }];
    var alt = [{ r: a + 1, k: b }, { r: a, k: b + 1 }, { r: Math.max(1, b), k: Math.max(1, a) === a ? a + 1 : a }];
    shuffle(alt); options.push(alt[0], alt[1]); shuffle(options);
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center"><h3>איזה מערך מתאים ל-' + mexpr(a + ' × ' + b) + '?</h3>' +
      '<p class="muted">' + a + ' שורות של ' + b + '</p>' +
      '<div class="grid2" id="opts">' +
      options.map(function (o, i) { return '<div class="tile" tabindex="0" role="button" data-i="' + i + '" data-ok="' + (o.ok ? 1 : 0) + '">' + arrayDots(o.r, o.k, i % 2 ? 'berry' : '') + '</div>'; }).join('') +
      '</div><div class="feedback" id="fb"></div>' +
      '<button class="btn btn-soft btn-sm" id="say" style="width:auto;margin:8px auto 0">🔊 שמע</button>' +
      '</div></div>';
    speak('איזה מערך מתאים ל ' + a + ' כפול ' + b + '?');
    document.getElementById('say').onclick = function () { speak('איזה מערך מתאים ל ' + a + ' כפול ' + b + '?'); };
    var answered = false; var t0 = Date.now();
    Array.prototype.forEach.call(app.querySelectorAll('#opts .tile'), function (t) {
      bindBtn(t.id || (t.id = 'opt' + t.getAttribute('data-i')), function () {
        if (answered) return; answered = true;
        var ok = t.getAttribute('data-ok') === '1';
        t.classList.add('sel'); t.style.borderColor = ok ? 'var(--good)' : 'var(--bad)';
        var fb = document.getElementById('fb');
        if (ok) { run.correct++; S.stats.arraysCorrect++; fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success); gradeAndPersist(c.id, { correct: true, usedHint: false, latencyMs: Date.now() - t0, now: Date.now() }); }
        else { fb.className = 'feedback bad'; fb.textContent = 'זה ' + a + ' שורות של ' + b + '.'; gradeAndPersist(c.id, { correct: false, usedHint: true, latencyMs: Date.now() - t0, now: Date.now() }); }
        speak(fb.textContent); save();
        setTimeout(function () { run.i++; render(); }, ok ? 800 : 1400);
      });
    });
  }

  /* ============================== GAME 2: MULTIPLICATION TRAIN ==============================
   * Learning outcome: fact retrieval + matching expression↔product (commutativity-friendly). */
  function renderTrainGame() {
    if (!run || run.game !== 'train') { run = { game: 'train', round: 0, n: 4, correct: 0, stars0: S.rewards.stars }; logEvent(EV.game_started, { game: 'train' }); }
    if (run.round >= run.n) return finishGame('🚂 רכבת הכפל');
    var picks = shuffle(S.cards.filter(function (c) { return c.b >= 2 && c.state !== 'new'; }));
    if (picks.length < 3) picks = shuffle(S.cards.filter(function (c) { return c.b >= 2 && c.b <= 5; }));
    picks = picks.slice(0, 3);
    var exprs = picks.map(function (c) { return { id: c.id, a: c.a, b: c.b, p: c.product }; });
    var results = shuffle(exprs.map(function (e) { return { p: e.p, id: e.id }; }));
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card"><h3 class="center">חברי כל תרגיל לקרון התוצאה 🚂</h3>' +
      '<div class="train-row" id="exprs">' +
      exprs.map(function (e) { return '<div class="card-chip" data-id="' + e.id + '" data-role="expr">' + mexpr(e.a + ' × ' + e.b) + '</div>'; }).join('') +
      '</div><hr style="border:none;border-top:2px dashed var(--line);margin:14px 0">' +
      '<div class="train-row" id="results">' +
      results.map(function (r) { return '<div class="card-chip" data-id="' + r.id + '" data-role="res"><span class="num">' + r.p + '</span></div>'; }).join('') +
      '</div><div class="feedback" id="fb"></div></div></div>';
    var selExpr = null;
    function clearSel() { Array.prototype.forEach.call(app.querySelectorAll('.card-chip'), function (x) { x.classList.remove('sel'); }); }
    function bindChip(chip) {
      chip.onclick = function () {
        if (chip.classList.contains('matched')) return;
        var role = chip.getAttribute('data-role');
        if (role === 'expr') { clearSel(); selExpr = chip; chip.classList.add('sel'); return; }
        if (!selExpr) { var fb0 = document.getElementById('fb'); fb0.className = 'feedback'; fb0.textContent = 'קודם בחרי תרגיל למעלה.'; return; }
        var ok = chip.getAttribute('data-id') === selExpr.getAttribute('data-id');
        var fb = document.getElementById('fb');
        if (ok) {
          chip.classList.add('matched'); selExpr.classList.add('matched'); selExpr.classList.remove('sel');
          gradeAndPersist(chip.getAttribute('data-id'), { correct: true, usedHint: false, latencyMs: 2000, now: Date.now() });
          run.correct++; fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success); save();
          if (app.querySelectorAll('.card-chip[data-role="expr"]:not(.matched)').length === 0) {
            setTimeout(function () { run.round++; render(); }, 700);
          }
          selExpr = null;
        } else {
          chip.classList.add('bad'); fb.className = 'feedback bad'; fb.textContent = 'לא מתאים, נסי שוב.';
          setTimeout(function () { chip.classList.remove('bad'); }, 500);
        }
      };
    }
    Array.prototype.forEach.call(app.querySelectorAll('.card-chip'), bindChip);
  }

  /* ============================== GAME 3: BALLOON POP REVIEW ==============================
   * Learning outcome: fluent recognition of a product among distractors (review). */
  function renderBalloonGame() {
    if (!run || run.game !== 'balloons') { run = { game: 'balloons', round: 0, n: 5, correct: 0, stars0: S.rewards.stars }; logEvent(EV.game_started, { game: 'balloons' }); }
    if (run.round >= run.n) return finishGame('🎈 פיצוץ בלונים');
    var c = gamePickFact(); var p = c.product;
    var vals = [p, p]; // two correct balloons
    var distract = productChoices(p, c.a, c.b).filter(function (x) { return x !== p; }).slice(0, 4);
    vals = vals.concat(distract); shuffle(vals);
    var html = '';
    vals.forEach(function (v, i) {
      var left = 6 + (i % 3) * 32 + Math.random() * 6;
      var top = 8 + Math.floor(i / 3) * 46 + Math.random() * 6;
      html += '<button class="balloon b' + ((i % 4) + 1) + '" data-v="' + v + '" style="inset-inline-start:' + left + '%;top:' + top + '%" aria-label="בלון ' + v + '"><span class="num">' + v + '</span></button>';
    });
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center"><h3>פוצצי רק בלונים ששווים ל-' + mexpr(c.a + ' × ' + c.b) + '</h3>' +
      '<p class="muted">התשובה: כל בלון עם הסכום הנכון</p>' +
      '<div class="sky-area" id="sky">' + html + '</div>' +
      '<div class="feedback" id="fb"></div>' +
      '<button class="btn btn-soft btn-sm" id="say" style="width:auto;margin:8px auto 0">🔊 שמע</button>' +
      '</div></div>';
    speak('פוצצי בלונים ששווים ל ' + c.a + ' כפול ' + c.b);
    document.getElementById('say').onclick = function () { speak('כמה זה ' + c.a + ' כפול ' + c.b + '?'); };
    var need = 2, popped = 0, wrong = false, t0 = Date.now();
    Array.prototype.forEach.call(app.querySelectorAll('.balloon'), function (bn) {
      bn.onclick = function () {
        var v = Number(bn.getAttribute('data-v'));
        var fb = document.getElementById('fb');
        if (v === p && !bn.classList.contains('gone')) {
          bn.classList.add('gone'); popped++;
          fb.className = 'feedback good'; fb.textContent = 'פּוֹף! 🎉';
          if (popped >= need) {
            gradeAndPersist(c.id, { correct: !wrong, usedHint: wrong, latencyMs: Date.now() - t0, now: Date.now() });
            if (!wrong) run.correct++; save();
            setTimeout(function () { run.round++; render(); }, 700);
          }
        } else if (v !== p) {
          wrong = true; bn.classList.add('shake');
          fb.className = 'feedback bad'; fb.textContent = 'אופס, ' + v + ' זה לא נכון.';
          setTimeout(function () { bn.classList.remove('shake'); }, 400);
        }
      };
    });
  }

  /* ============================== ACTION GAME: ORCHARD HARVEST (קטיף בוסתן) ==============================
   * Learning outcome: fast, accurate single-fact recall with diagnostic
   * distractors; combo scoring rewards a streak of correct picks. */
  function renderOrchardGame() {
    if (!run || run.game !== 'orchard') { run = { game: 'orchard', round: 0, n: 6, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0 }; logEvent(EV.game_started, { game: 'orchard' }); }
    if (run.round >= run.n) return finishGame('🍎 קטיף בוסתן');
    var c = gamePickFact(); var p = c.product;
    var choices = productChoices(p, c.a, c.b);
    var html = choices.map(function (v) {
      return '<button class="choice apple" data-v="' + v + '" aria-label="תפוח ' + v + '">🍎<span class="num">' + v + '</span></button>';
    }).join('');
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<h3>קטפי את התפוח של ' + mexpr(c.a + ' × ' + c.b) + '</h3>' +
      '<p class="muted">(' + (run.round + 1) + '/' + run.n + ')</p>' +
      '<div class="orchard">🌳</div>' +
      '<div class="choices" id="apples">' + html + '</div>' +
      '<div class="feedback" id="fb"></div>' +
      '<button class="btn btn-soft btn-sm" id="say" style="width:auto;margin-top:8px">🔊 שמע</button>' +
      '</div></div>';
    speak('קטפי את התפוח של ' + c.a + ' כפול ' + c.b);
    document.getElementById('say').onclick = function () { speak('כמה זה ' + c.a + ' כפול ' + c.b + '?'); };
    var t0 = Date.now(), hadWrong = false, answered = false;
    Array.prototype.forEach.call(app.querySelectorAll('.apple'), function (bn) {
      bn.onclick = function () {
        if (answered) return;
        var v = Number(bn.getAttribute('data-v')); var fb = document.getElementById('fb');
        if (v === p) {
          answered = true;
          FX.sfx(run.combo >= 2 ? 'combo' : 'correct'); FX.burstAt(bn, '#e23b3b', 14);
          run.combo++; run.score += 10 * Math.max(1, run.combo); if (!hadWrong) run.correct++; hudUpdate(run);
          gradeAndPersist(c.id, { correct: true, usedHint: hadWrong, latencyMs: Date.now() - t0, now: Date.now() });
          fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success); save();
          setTimeout(function () { run.round++; render(); }, 650);
        } else {
          hadWrong = true; run.combo = 0; hudUpdate(run); recordError(c, v);
          bn.classList.add('shake'); FX.sfx('wrong');
          fb.className = 'feedback bad'; fb.textContent = 'אופס, ' + v + ' לא נכון. נסי שוב!';
          setTimeout(function () { bn.classList.remove('shake'); }, 400);
        }
      };
    });
  }

  /* ============================== GAMES HUB ============================== */
  function renderGamesHub() {
    var games = [
      { id: 'game_runner', emoji: '🏃', name: 'ריצת האלופה', tag: 'אקשן' },
      { id: 'game_duel', emoji: '⚔️', name: 'קרב אלופות', tag: 'אקשן' },
      { id: 'game_whack', emoji: '🐹', name: 'חפרפרות הכפל', tag: 'אקשן' },
      { id: 'game_shooter', emoji: '🛡️', name: 'מגן הגינה', tag: 'אקשן' },
      { id: 'game_rhythm', emoji: '🥁', name: 'תופי הכפל', tag: 'קצב' },
      { id: 'game_memory', emoji: '🃏', name: 'זוג מנצח', tag: 'זיכרון' },
      { id: 'game_balloons', emoji: '🎈', name: 'פיצוץ בלונים', tag: 'אקשן' },
      { id: 'game_skip', emoji: '🦘', name: 'קפיצות בגינה', tag: 'ספירה' },
      { id: 'game_arrays', emoji: '🌱', name: 'גינת המערכים', tag: 'הבנה' },
      { id: 'game_train', emoji: '🚂', name: 'רכבת הכפל', tag: 'התאמה' },
      { id: 'game_orchard', emoji: '🍎', name: 'קטיף בוסתן', tag: 'אקשן' }
    ];
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card"><div class="row between"><h2 style="margin:0">🎮 משחקים</h2>' +
      '<label class="zen-toggle"><input type="checkbox" id="zen"' + (S.settings.zen ? ' checked' : '') + '> מצב רגוע</label></div>' +
      '<p class="muted">מצב רגוע מאט את משחקי האקשן ומסיר לחץ-זמן.</p>' +
      '<div class="grid2">' +
      games.map(function (g) { return '<div class="tile game-tile" tabindex="0" role="button" id="' + g.id + '"><span class="emoji">' + g.emoji + '</span>' + g.name + '<small class="muted">' + g.tag + '</small></div>'; }).join('') +
      '</div><button class="btn btn-primary" id="back" style="margin-top:12px">חזרה הביתה</button></div></div>';
    document.getElementById('back').onclick = function () { go('home'); };
    document.getElementById('zen').onchange = function (e) { S.settings.zen = e.target.checked; save(); };
    games.forEach(function (g) { bindBtn(g.id, function () { run = null; go(g.id); }); });
  }

  /* ============================== ACTION GAME: WHACK-A-MOLE (חפרפרות הכפל) ============================== */
  function renderWhackGame() {
    if (!run || run.game !== 'whack') { run = { game: 'whack', q: 0, n: 6, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0 }; logEvent(EV.game_started, { game: 'whack' }); }
    if (run.q >= run.n) return finishGame('🐹 חפרפרות הכפל');
    var c = gamePickFact(), p = c.product; run.answered = false; run.hadWrong = false;
    var distract = productChoices(p, c.a, c.b).filter(function (x) { return x !== p; });
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<h3>איזו חפרפרת מציגה את ' + mexpr(c.a + ' × ' + c.b) + '?</h3>' +
      '<p class="muted">הקישי על ' + p + ' לפני שהיא נעלמת! (' + (run.q + 1) + '/' + run.n + ')</p>' +
      '<div class="mole-grid" id="moles">' +
      '012345678'.split('').map(function (i) { return '<div class="hole"><div class="mole" data-h="' + i + '"></div></div>'; }).join('') +
      '</div><div class="feedback" id="fb"></div></div></div>';
    var moles = [].slice.call(app.querySelectorAll('.mole'));
    var upMs = S.settings.zen ? 1500 : Math.max(800, 1300 - run.q * 70);
    function popOne() {
      if (run.answered) return;
      var free = moles.filter(function (m) { return !m.classList.contains('up'); });
      if (!free.length) return;
      var m = pick(free);
      var anyCorrect = app.querySelector('.mole.up[data-correct="1"]');
      var val = (!anyCorrect || Math.random() < 0.5) ? p : pick(distract.length ? distract : [p + 1, p + 2]);
      m.textContent = val; m.setAttribute('data-val', val); m.setAttribute('data-correct', val === p ? '1' : '0');
      m.classList.add('up');
      var down = setTimeout(function () { m.classList.remove('up'); m.removeAttribute('data-correct'); }, upMs);
      m.onclick = function () {
        if (run.answered) return;
        var v = Number(m.getAttribute('data-val')); var fb = document.getElementById('fb');
        if (v === p) {
          run.answered = true; clearTimeout(down); m.classList.remove('up');
          FX.sfx(run.combo >= 2 ? 'combo' : 'correct'); FX.burstAt(m, '#ffd23f', 14);
          run.combo++; run.score += 10 * Math.max(1, run.combo); run.correct++; hudUpdate(run);
          gradeAndPersist(c.id, { correct: true, usedHint: run.hadWrong, latencyMs: 1500, now: Date.now() });
          fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success); save();
          setTimeout(function () { run.q++; render(); }, 650);
        } else {
          run.hadWrong = true; run.combo = 0; hudUpdate(run); FX.sfx('wrong'); FX.shake(); recordError(c, v);
          m.classList.add('bonk'); setTimeout(function () { m.classList.remove('bonk'); }, 300);
        }
      };
    }
    FX.addTimer(setInterval(popOne, S.settings.zen ? 950 : Math.max(480, 850 - run.q * 40)));
    popOne();
  }

  /* ============================== ACTION GAME: SHOOTER/DODGER (מגן הגינה) ============================== */
  function renderShooterGame() {
    if (!run || run.game !== 'shooter') { run = { game: 'shooter', q: 0, n: 6, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0 }; logEvent(EV.game_started, { game: 'shooter' }); }
    if (run.q >= run.n) return finishGame('🛡️ מגן הגינה');
    var c = gamePickFact(), p = c.product; run.answered = false; run.hadWrong = false;
    var distract = productChoices(p, c.a, c.b).filter(function (x) { return x !== p; }).slice(0, 4);
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<h3>הגנּי על הגינה! פוצצי את ' + mexpr(c.a + ' × ' + c.b) + '</h3>' +
      '<p class="muted">הקישי על התשובה הנכונה לפני שתיגע בקרקע (' + (run.q + 1) + '/' + run.n + ')</p>' +
      '<div class="fall-area" id="fall"></div>' +
      '<div class="feedback" id="fb"></div></div></div>';
    var area = document.getElementById('fall');
    var dur = S.settings.zen ? 5400 : Math.max(2800, 4400 - run.q * 220);
    function spawn(val) {
      var t = document.createElement('button'); t.className = 'fall-tile'; t.textContent = val; t.setAttribute('data-val', val);
      t.style.insetInlineStart = (6 + Math.floor(Math.random() * 4) * 23 + Math.random() * 4) + '%';
      t.style.animationDuration = dur + 'ms';
      area.appendChild(t);
      var kill = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); if (Number(val) === p && !run.answered) { run.combo = 0; hudUpdate(run); } }, dur);
      t.onclick = function () {
        if (run.answered) return;
        var v = Number(t.getAttribute('data-val')); var fb = document.getElementById('fb');
        if (v === p) {
          run.answered = true; clearTimeout(kill); t.classList.add('boom');
          FX.sfx(run.combo >= 2 ? 'combo' : 'correct'); FX.burstAt(t, '#3aa76d', 16);
          run.combo++; run.score += 10 * Math.max(1, run.combo); run.correct++; hudUpdate(run);
          gradeAndPersist(c.id, { correct: true, usedHint: run.hadWrong, latencyMs: 1600, now: Date.now() });
          fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success); save();
          setTimeout(function () { run.q++; render(); }, 650);
        } else {
          run.hadWrong = true; run.combo = 0; hudUpdate(run); FX.sfx('wrong'); FX.shake(); recordError(c, v);
          t.classList.add('boom'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 200);
        }
      };
    }
    var vals = shuffle([p].concat(distract)), vi = 0;
    spawn(p); // immediate fair target
    FX.addTimer(setInterval(function () { if (run.answered) return; var v = Math.random() < 0.45 ? p : vals[vi++ % vals.length]; spawn(v); }, S.settings.zen ? 1150 : Math.max(650, 1000 - run.q * 40)));
  }

  /* ============================== MEMORY MATCH (זוג מנצח) ============================== */
  function renderMemoryGame() {
    if (!run || run.game !== 'memory') { run = { game: 'memory', correct: 0, stars0: S.rewards.stars, score: 0, combo: 0 }; logEvent(EV.game_started, { game: 'memory' }); }
    var picks = shuffle(S.cards.filter(function (c) { return c.b >= 2 && c.state !== 'new'; }));
    if (picks.length < 4) picks = shuffle(S.cards.filter(function (c) { return c.b >= 2 && c.b <= 6; }));
    picks = picks.slice(0, 4);
    var cards = [];
    picks.forEach(function (c) { cards.push({ id: c.id, role: 'expr', label: c.a + ' × ' + c.b }); cards.push({ id: c.id, role: 'res', label: '' + c.product }); });
    shuffle(cards);
    run.total = picks.length; run.matched = 0;
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<h3>זוג מנצח 🃏</h3><p class="muted">מצאי לכל תרגיל את התוצאה שלו</p>' +
      '<div class="mem-grid" id="mem">' +
      cards.map(function (card, i) { return '<button class="mem-card" data-i="' + i + '" data-id="' + card.id + '" data-role="' + card.role + '"><span class="mem-face"><span class="mexpr">' + card.label + '</span></span></button>'; }).join('') +
      '</div><div class="feedback" id="fb"></div>' +
      '<button class="btn btn-soft btn-sm" id="back" style="width:auto;margin:10px auto 0">חזרה</button></div></div>';
    document.getElementById('back').onclick = function () { run = null; go('games_hub'); };
    var first = null, lock = false, tries = {};
    Array.prototype.forEach.call(app.querySelectorAll('.mem-card'), function (btn) {
      btn.onclick = function () {
        if (lock || btn.classList.contains('open') || btn.classList.contains('done')) return;
        btn.classList.add('open'); FX.sfx('tick');
        if (!first) { first = btn; return; }
        var id1 = first.getAttribute('data-id'), id2 = btn.getAttribute('data-id');
        var r1 = first.getAttribute('data-role'), r2 = btn.getAttribute('data-role');
        var fb = document.getElementById('fb');
        if (id1 === id2 && r1 !== r2) {
          first.classList.add('done'); btn.classList.add('done'); FX.sfx('correct'); FX.burstAt(btn, '#3775D6', 12);
          run.matched++; run.combo++; run.score += 10; run.correct++; hudUpdate(run);
          gradeAndPersist(id1, { correct: true, usedHint: (tries[id1] || 0) > 0, latencyMs: 2000, now: Date.now() });
          fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success); save(); first = null;
          if (run.matched >= run.total) setTimeout(function () { finishGame('🃏 זוג מנצח'); }, 700);
        } else {
          tries[id1] = (tries[id1] || 0) + 1; run.combo = 0; hudUpdate(run); FX.sfx('wrong');
          lock = true; var a = first, b = btn;
          setTimeout(function () { a.classList.remove('open'); b.classList.remove('open'); lock = false; }, 700); first = null;
        }
      };
    });
  }

  /* ============================== ACTION GAME: ENDLESS RUNNER (ריצת האלופה) ============================== */
  function renderRunnerGame() {
    if (!run || run.game !== 'runner') { run = { game: 'runner', q: 0, n: 6, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0, meters: 0 }; logEvent(EV.game_started, { game: 'runner' }); }
    if (run.q >= run.n) return finishGame('🏃 ריצת האלופה');
    var c = gamePickFact(), p = c.product; run.answered = false; run.hadWrong = false;
    var distract = productChoices(p, c.a, c.b).filter(function (x) { return x !== p; }).slice(0, 2);
    var doors = shuffle([p].concat(distract));
    var spd = S.settings.zen ? 5400 : Math.max(2600, 4200 - run.q * 230);
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<h3>רוצי לשער הנכון: ' + mexpr(c.a + ' × ' + c.b) + '</h3>' +
      '<p class="muted">(' + (run.q + 1) + '/' + run.n + ') מטרים: <span class="num" id="meters">' + run.meters + '</span></p>' +
      '<div class="run-area" id="runArea"><div class="ground"></div><div class="runner-fox">🦊</div>' +
      '<div class="gate" style="animation-duration:' + spd + 'ms">' +
      doors.map(function (v, i) { return '<button class="door door-' + i + '" data-val="' + v + '"><span class="num">' + v + '</span></button>'; }).join('') +
      '</div></div><div class="feedback" id="fb"></div></div></div>';
    function resolve(winning, doorEl, v) {
      var fb = document.getElementById('fb');
      if (winning) {
        if (run.answered) return; run.answered = true;
        FX.sfx(run.combo >= 2 ? 'combo' : 'correct'); if (doorEl) FX.burstAt(doorEl, '#3aa76d', 16);
        run.combo++; run.score += 10 * Math.max(1, run.combo); run.meters += 20 + run.combo * 2; run.correct++; hudUpdate(run);
        gradeAndPersist(c.id, { correct: true, usedHint: run.hadWrong, latencyMs: 1600, now: Date.now() });
        fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success); save();
        setTimeout(function () { run.q++; render(); }, 650);
      } else {
        run.hadWrong = true; run.combo = 0; hudUpdate(run); FX.sfx('wrong'); FX.shake();
        if (typeof v === 'number') recordError(c, v);
        fb.className = 'feedback bad'; fb.textContent = 'לא נכון — נסי שער אחר! 🦊';
      }
    }
    Array.prototype.forEach.call(app.querySelectorAll('.door'), function (d) {
      d.onclick = function () { var v = Number(d.getAttribute('data-val')); resolve(v === p, d, v); };
    });
    FX.addTimer(setTimeout(function () {
      if (run.answered) return; run.answered = true; run.combo = 0; hudUpdate(run); FX.sfx('wrong');
      var fb = document.getElementById('fb'); if (fb) { fb.className = 'feedback bad'; fb.textContent = 'השער חלף! ממשיכים.'; }
      gradeAndPersist(c.id, { correct: false, usedHint: true, latencyMs: spd, now: Date.now() });
      setTimeout(function () { run.q++; render(); }, 700);
    }, spd));
  }

  /* ============================== ACTION GAME: DUEL VS FOX (קרב אלופות) ============================== */
  function renderDuelGame() {
    if (!run || run.game !== 'duel') { run = { game: 'duel', round: 0, n: 7, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0, pHp: 5, aiHp: 5 }; logEvent(EV.game_started, { game: 'duel' }); }
    if (run.pHp <= 0 || run.aiHp <= 0 || run.round >= run.n) {
      var won = run.aiHp <= 0 || (run.pHp > run.aiHp);
      run.endTitle = won ? '👑 ניצחת את השועל!' : '🦊 השועל ניצח הפעם';
      return finishGame('⚔️ קרב אלופות');
    }
    var c = gamePickFact(), p = c.product; run.answered = false;
    var choices = productChoices(p, c.a, c.b);
    var aiMs = S.settings.zen ? 6500 : Math.max(2200, 3900 - run.round * 220);
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<div class="duel-bars">' +
      '<div class="hp"><span>👧 ' + escapeHtml(NAME()) + '</span><div class="hp-track"><i id="pHp" style="width:' + (run.pHp / 5 * 100) + '%"></i></div></div>' +
      '<div class="hp"><span>🦊 השועל</span><div class="hp-track"><i id="aiHp" style="width:' + (run.aiHp / 5 * 100) + '%;background:#e07a4f"></i></div></div>' +
      '</div>' +
      '<h3>מי מהר יותר? ' + mexpr(c.a + ' × ' + c.b) + '</h3>' +
      '<div class="ai-timer"><i id="aiBar" style="animation-duration:' + aiMs + 'ms"></i></div>' +
      '<div class="choices" id="choices">' + choices.map(function (v) { return '<button class="choice" data-v="' + v + '"><span class="num">' + v + '</span></button>'; }).join('') + '</div>' +
      '<div class="feedback" id="fb"></div></div></div>';
    function endRound(playerScored, picked, doorEl) {
      if (run.answered) return; run.answered = true;
      var fb = document.getElementById('fb');
      if (playerScored) {
        FX.sfx(run.combo >= 2 ? 'combo' : 'correct'); run.combo++; run.score += 10; run.correct++; run.aiHp--; if (doorEl) FX.burstAt(doorEl, '#3aa76d', 14);
        gradeAndPersist(c.id, { correct: true, usedHint: false, latencyMs: 1500, now: Date.now() });
        fb.className = 'feedback good'; fb.textContent = 'ניצחת את הסיבוב! 💥';
      } else {
        FX.sfx('wrong'); FX.shake(); run.combo = 0; run.pHp--; if (typeof picked === 'number') recordError(c, picked);
        gradeAndPersist(c.id, { correct: false, usedHint: true, latencyMs: aiMs, now: Date.now() });
        fb.className = 'feedback bad'; fb.textContent = (picked == null ? 'השועל הקדים! 🦊' : 'אופס! 🦊') + ' התשובה: ' + p;
      }
      hudUpdate(run); save();
      setTimeout(function () { run.round++; render(); }, 850);
    }
    Array.prototype.forEach.call(app.querySelectorAll('.choice'), function (b) {
      b.onclick = function () { var v = Number(b.getAttribute('data-v')); b.classList.add(v === p ? 'correct' : 'wrong'); endRound(v === p, v, b); };
    });
    FX.addTimer(setTimeout(function () { endRound(false, null, null); }, aiMs));
  }

  /* ============================== RHYTHM GAME (תופי הכפל) ============================== */
  function renderRhythmGame() {
    if (!run || run.game !== 'rhythm') { run = { game: 'rhythm', hits: 0, target: 8, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0 }; logEvent(EV.game_started, { game: 'rhythm' }); }
    var introFam = E.activeIntroFamily(S.cards);
    var map = { fives: 5, threes: 3, fours: 4, twos: 2, tens: 10, sixes: 6, nines: 9, eights: 8, sevens: 7 };
    var m = map[introFam] || pick([2, 3, 4, 5, 10]); run.m = m;
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<h3>תופי הכפל 🥁 — קצב של ' + m + '</h3>' +
      '<p class="muted">הקישי רק על הכפולות של ' + m + ' (<span class="num" id="hits">' + run.hits + '</span>/' + run.target + ')</p>' +
      '<div class="beat-track" id="track"><div class="hit-zone"></div></div>' +
      '<div class="feedback" id="fb"></div></div></div>';
    var track = document.getElementById('track');
    var dur = S.settings.zen ? 4200 : 2700;
    var k = 0;
    function spawnToken() {
      var isMult = Math.random() < 0.62, val;
      if (isMult) { k++; val = m * (((k - 1) % 10) + 1); }
      else { val = m * (Math.floor(Math.random() * 10) + 1) + (Math.random() < 0.5 ? 1 : -1); if (val <= 0) val = m + 1; }
      var mult = (val % m === 0 && val > 0);
      var t = document.createElement('button'); t.className = 'beat-token'; t.textContent = val;
      t.setAttribute('data-val', val); t.setAttribute('data-mult', mult ? '1' : '0');
      t.style.animationDuration = dur + 'ms'; track.appendChild(t);
      var kill = setTimeout(function () { if (t.parentNode) { if (mult && !t.disabled) { run.combo = 0; hudUpdate(run); } t.parentNode.removeChild(t); } }, dur);
      t.onclick = function () {
        if (t.disabled) return; t.disabled = true;
        var fb = document.getElementById('fb');
        if (mult) {
          FX.sfx(run.combo >= 2 ? 'combo' : 'pop'); FX.burstAt(t, '#ff7aa2', 10); t.classList.add('hit');
          run.combo++; run.score += 5 * Math.max(1, run.combo); run.hits++; run.correct++; hudUpdate(run);
          var hEl = document.getElementById('hits'); if (hEl) hEl.textContent = run.hits;
          var factor = Math.round(val / m); if (factor >= 0 && factor <= 10) gradeAndPersist(E.factId(m, factor), { correct: true, usedHint: false, latencyMs: 1400, now: Date.now() });
          save();
          if (run.hits >= run.target) { clearTimeout(kill); FX.clearTimers(); setTimeout(function () { finishGame('🥁 תופי הכפל'); }, 500); }
        } else { run.combo = 0; hudUpdate(run); FX.sfx('wrong'); t.classList.add('miss'); }
      };
    }
    FX.addTimer(setInterval(spawnToken, S.settings.zen ? 1100 : 760));
    spawnToken();
  }

  function finishGame(name) {
    S.stats.gamesPlayed++; bumpChest(1); bumpWeekly('games', 1); setRecord('bestGameScore', run ? (run.score || 0) : 0); checkBadges(); save();
    logEvent(EV.game_completed, { game: name, correct: run ? run.correct : 0, score: run ? run.score : 0 });
    var earned = S.rewards.stars - (run ? run.stars0 : S.rewards.stars);
    var score = run ? (run.score || 0) : 0;
    var endTitle = run ? run.endTitle : null;
    run = null;
    celebrate({ title: endTitle || name, sub: score ? (NAME() + ', ניקוד: ' + score + ' 🎯') : ('כל הכבוד, ' + NAME() + '!'), earned: earned, then: 'games_hub' });
  }

  /* ============================== PRACTICE CENTRE (addition ≤100 + word problems) ==============================
   * A separate activity area. It awards a little currency but deliberately does
   * NOT feed the multiplication mastery state, ranks or the journey map. */
  function practiceStats() {
    if (!S.stats.practice) S.stats.practice = { addCorrect: 0, addTotal: 0, wordCorrect: 0, wordTotal: 0 };
    return S.stats.practice;
  }
  function practiceGrade(kind, correct) {
    var pr = practiceStats();
    var key = (kind === 'word') ? 'word' : 'add';
    pr[key + 'Total']++;
    if (correct) { pr[key + 'Correct']++; awardStars(1, 'practice:' + kind); bumpDaily(1, 0); }
    bumpWeekly('practice', 1);
    save();
  }
  function finishPractice(name) {
    S.stats.gamesPlayed++; bumpWeekly('games', 1); setRecord('bestGameScore', run ? (run.score || 0) : 0); save();
    logEvent(EV.game_completed, { game: name });
    var earned = S.rewards.stars - (run ? run.stars0 : S.rewards.stars);
    var score = run ? (run.score || 0) : 0;
    run = null;
    // Plain celebration (practice never changes the multiplication rank).
    go('celebrate', { title: name, sub: score ? (NAME() + ', ניקוד: ' + score + ' 🎯') : ('כל הכבוד, ' + NAME() + '!'), earned: earned, then: 'practice_hub' });
  }

  function renderPracticeHub() {
    var pr = practiceStats();
    var addAcc = pr.addTotal ? Math.round(pr.addCorrect / pr.addTotal * 100) : 0;
    var wordAcc = pr.wordTotal ? Math.round(pr.wordCorrect / pr.wordTotal * 100) : 0;
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card"><div class="row between"><h2 style="margin:0">📝 מרכז התרגול</h2><button class="link" id="back">בית</button></div>' +
      '<p class="muted">חיבור עד 100 ושאלות מילוליות — תרגול נפרד ממסע הכפל.</p>' +
      '<div class="grid2">' +
      '<div class="tile" tabindex="0" role="button" id="addh"><span class="emoji">➕</span>חיבור במאוזן<small class="muted">a + b = ?</small></div>' +
      '<div class="tile" tabindex="0" role="button" id="addv"><span class="emoji">🧮</span>חיבור במאונך<small class="muted">עם נשיאה</small></div>' +
      '<div class="tile" tabindex="0" role="button" id="word"><span class="emoji">📖</span>שאלות מילוליות<small class="muted">כפל וחיבור</small></div>' +
      '</div>' +
      '<p class="muted" style="margin-top:10px">דיוק חיבור: <b>' + addAcc + '%</b> (' + pr.addTotal + ' תרגילים) · שאלות מילוליות: <b>' + wordAcc + '%</b> (' + pr.wordTotal + ')</p>' +
      '</div></div>';
    bindBtn('back', function () { go('home'); });
    bindBtn('addh', function () { run = null; go('practice_add_h'); });
    bindBtn('addv', function () { run = null; go('practice_add_v'); });
    bindBtn('word', function () { run = null; go('practice_word'); });
  }

  /* Horizontal addition (a + b = ?), multiple choice. */
  function renderAddHoriz() {
    if (!run || run.game !== 'addh') { run = { game: 'addh', round: 0, n: 6, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0 }; logEvent(EV.game_started, { game: 'add_horizontal' }); }
    if (run.round >= run.n) return finishPractice('➕ חיבור במאוזן');
    var prob = E.buildAdditionProblem({ max: 100, twoDigit: run.round >= 2 });
    var choices = E.additionChoices(prob.sum);
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<h3>כמה זה?</h3>' +
      '<div class="prompt-q">' + mexpr(prob.a + ' + ' + prob.b) + '</div>' +
      '<p class="muted">(' + (run.round + 1) + '/' + run.n + ')</p>' +
      '<div class="choices" id="choices">' + choices.map(function (v) { return '<button class="choice" data-v="' + v + '"><span class="num">' + v + '</span></button>'; }).join('') + '</div>' +
      '<div class="feedback" id="fb"></div>' +
      '<button class="btn btn-soft btn-sm" id="say" style="width:auto;margin-top:8px">🔊 שמע</button>' +
      '</div></div>';
    speak('כמה זה ' + prob.a + ' ועוד ' + prob.b + '?');
    bindBtn('say', function () { speak('כמה זה ' + prob.a + ' ועוד ' + prob.b + '?'); });
    var answered = false, hadWrong = false;
    Array.prototype.forEach.call(app.querySelectorAll('.choice'), function (bn) {
      bn.onclick = function () {
        if (answered) return;
        var v = Number(bn.getAttribute('data-v')); var fb = document.getElementById('fb');
        if (v === prob.sum) {
          answered = true; bn.classList.add('correct');
          FX.sfx(run.combo >= 2 ? 'combo' : 'correct'); FX.burstAt(bn, '#3aa76d', 14);
          run.combo++; run.score += 10 * Math.max(1, run.combo); if (!hadWrong) run.correct++; hudUpdate(run);
          practiceGrade('add', !hadWrong);
          fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success);
          setTimeout(function () { run.round++; render(); }, 650);
        } else {
          hadWrong = true; run.combo = 0; hudUpdate(run); bn.classList.add('shake'); FX.sfx('wrong');
          fb.className = 'feedback bad'; fb.textContent = 'לא בדיוק, ' + v + '. נסי שוב!';
          setTimeout(function () { bn.classList.remove('shake'); }, 400);
        }
      };
    });
  }

  /* Vertical (column) addition with carry — the real notebook algorithm.
   * The child fills the carry box and each result digit, then checks. */
  function renderAddVert() {
    if (!run || run.game !== 'addv') { run = { game: 'addv', round: 0, n: 5, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0 }; logEvent(EV.game_started, { game: 'add_vertical' }); }
    if (run.round >= run.n) return finishPractice('🧮 חיבור במאונך');
    var prob = E.buildAdditionProblem({ max: 100, twoDigit: true, requireCarry: run.round % 2 === 0 });
    var a = prob.a, b = prob.b, sum = prob.sum;
    var u = sum % 10, t = Math.floor(sum / 10) % 10, h = Math.floor(sum / 100);
    var carry = prob.carry; // expected carry into the tens column (0/1)
    var needH = sum >= 100;
    function dt(n) { return Math.floor(n / 10) % 10; }
    function du(n) { return n % 10; }
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card center">' + comboHud(run) +
      '<h3>חברי במאונך</h3>' +
      '<p class="muted">מלאי את ספרת האחדות, את הנשיאה (אם יש), ואז את העשרות. (' + (run.round + 1) + '/' + run.n + ')</p>' +
      '<div class="vadd" id="vadd">' +
        '<div class="vrow carry-row"><span class="cell"></span><input class="cell carry-in" id="cin" inputmode="numeric" maxlength="1" aria-label="נשיאה"><span class="cell"></span></div>' +
        '<div class="vrow"><span class="cell"></span><span class="cell">' + dt(a) + '</span><span class="cell">' + du(a) + '</span></div>' +
        '<div class="vrow"><span class="cell op">+</span><span class="cell">' + dt(b) + '</span><span class="cell">' + du(b) + '</span></div>' +
        '<div class="vline"></div>' +
        '<div class="vrow">' +
          '<input class="cell res' + (needH ? '' : ' ghost') + '" id="rh" inputmode="numeric" maxlength="1" aria-label="מאות"' + (needH ? '' : ' tabindex="-1"') + '>' +
          '<input class="cell res" id="rt" inputmode="numeric" maxlength="1" aria-label="עשרות">' +
          '<input class="cell res" id="ru" inputmode="numeric" maxlength="1" aria-label="אחדות">' +
        '</div>' +
      '</div>' +
      '<div class="feedback" id="fb"></div>' +
      '<div class="btn-row" style="justify-content:center"><button class="btn btn-primary btn-sm" id="check" style="width:auto">בדיקה</button>' +
      '<button class="btn btn-soft btn-sm" id="say" style="width:auto">🔊 שמע</button></div>' +
      '</div></div>';
    speak('חברי במאונך ' + a + ' ועוד ' + b);
    bindBtn('say', function () { speak('חברי ' + a + ' ועוד ' + b); });
    // auto-advance focus units -> carry -> tens -> (hundreds)
    var ru = document.getElementById('ru'), rt = document.getElementById('rt'), rh = document.getElementById('rh'), cin = document.getElementById('cin');
    if (ru) ru.focus();
    function digit(el) { var v = (el && el.value || '').trim(); return v === '' ? null : Number(v); }
    var answered = false, hadWrong = false;
    bindBtn('check', function () {
      if (answered) return;
      var okU = digit(ru) === u;
      var okT = digit(rt) === t;
      var okH = !needH || digit(rh) === h;
      var dc = digit(cin);
      var okC = (carry === 1) ? (dc === 1) : (dc === null || dc === 0);
      [ru, rt].concat(needH ? [rh] : []).concat([cin]).forEach(function (el) { if (el) el.classList.remove('bad', 'good'); });
      if (okU && okT && okH && okC) {
        answered = true;
        [ru, rt].concat(needH ? [rh] : []).forEach(function (el) { if (el) el.classList.add('good'); });
        FX.sfx(run.combo >= 2 ? 'combo' : 'correct'); FX.burstAt(document.getElementById('vadd'), '#3aa76d', 16);
        run.combo++; run.score += 12 * Math.max(1, run.combo); if (!hadWrong) run.correct++; hudUpdate(run);
        practiceGrade('add', !hadWrong);
        var fb = document.getElementById('fb'); fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success);
        FX.addTimer(setTimeout(function () { run.round++; render(); }, 800));
      } else {
        hadWrong = true; run.combo = 0; hudUpdate(run); FX.sfx('wrong');
        if (!okU && ru) ru.classList.add('bad');
        if (!okC && cin) cin.classList.add('bad');
        if (!okT && rt) rt.classList.add('bad');
        if (!okH && rh) rh.classList.add('bad');
        var fb2 = document.getElementById('fb'); fb2.className = 'feedback bad';
        fb2.textContent = (!okU ? 'בדקי את האחדות. ' : '') + (!okC ? 'אל תשכחי את הנשיאה! ' : '') + (!okT ? 'בדקי את העשרות.' : '') || 'כמעט! נסי שוב.';
      }
    });
  }

  /* Word problems — mix of multiplication and addition (≤100), multiple choice. */
  function renderWordProblems() {
    if (!run || run.game !== 'word') { run = { game: 'word', round: 0, n: 6, correct: 0, stars0: S.rewards.stars, score: 0, combo: 0 }; logEvent(EV.game_started, { game: 'word' }); }
    if (run.round >= run.n) return finishPractice('📖 שאלות מילוליות');
    var useMul = Math.random() < 0.5;
    var text, answer, choices, sayText;
    if (useMul) {
      var c = gamePickFact();
      text = pick(C.wordTemplates)(c.a, c.b); answer = c.product; choices = productChoices(answer, c.a, c.b);
      sayText = 'בעיה מילולית בכפל.';
    } else {
      var prob = E.buildAdditionProblem({ max: 100, twoDigit: run.round >= 2 });
      text = pick(C.addWordTemplates)(prob.a, prob.b); answer = prob.sum; choices = E.additionChoices(answer);
      sayText = 'בעיה מילולית בחיבור.';
    }
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card">' + comboHud(run) +
      '<h3>שאלה מילולית</h3>' +
      '<p style="font-size:19px;font-weight:700;line-height:1.6">' + text + '</p>' +
      '<p class="muted center">(' + (run.round + 1) + '/' + run.n + ')</p>' +
      '<div class="choices" id="choices">' + choices.map(function (v) { return '<button class="choice" data-v="' + v + '"><span class="num">' + v + '</span></button>'; }).join('') + '</div>' +
      '<div class="feedback" id="fb"></div>' +
      '<button class="btn btn-soft btn-sm" id="say" style="width:auto;margin-top:8px">🔊 שמע</button>' +
      '</div></div>';
    speak(sayText);
    bindBtn('say', function () { var tmp = document.createElement('div'); tmp.innerHTML = text; speak(tmp.textContent || sayText); });
    var answered = false, hadWrong = false;
    Array.prototype.forEach.call(app.querySelectorAll('.choice'), function (bn) {
      bn.onclick = function () {
        if (answered) return;
        var v = Number(bn.getAttribute('data-v')); var fb = document.getElementById('fb');
        if (v === answer) {
          answered = true; bn.classList.add('correct');
          FX.sfx(run.combo >= 2 ? 'combo' : 'correct'); FX.burstAt(bn, '#3aa76d', 14);
          run.combo++; run.score += 10 * Math.max(1, run.combo); if (!hadWrong) run.correct++; hudUpdate(run);
          practiceGrade('word', !hadWrong);
          fb.className = 'feedback good'; fb.textContent = cheer(CHAMP.success);
          setTimeout(function () { run.round++; render(); }, 700);
        } else {
          hadWrong = true; run.combo = 0; hudUpdate(run); bn.classList.add('shake'); FX.sfx('wrong');
          fb.className = 'feedback bad'; fb.textContent = 'לא בדיוק. נסי לקרוא שוב!';
          setTimeout(function () { bn.classList.remove('shake'); }, 400);
        }
      };
    });
  }

  /* ============================== TOY SHOP (pets · garden · style) + CHESTS ============================== */
  var SKINS = [
    { key: '👑', label: 'אלופה', cost: 0 }, { key: '🦊', label: 'שועל', cost: 0 },
    { key: '🐰', label: 'ארנב', cost: 20 }, { key: '🦉', label: 'ינשוף', cost: 20 },
    { key: '🐢', label: 'צב', cost: 30 }, { key: '🦋', label: 'פרפר', cost: 30 },
    { key: '🌻', label: 'חמנייה', cost: 40 }, { key: '🐼', label: 'פנדה', cost: 50 }
  ];
  var ACCESSORIES = [
    { key: '🎀', label: 'סרט', cost: 10 }, { key: '🕶️', label: 'משקפיים', cost: 12 },
    { key: '🧣', label: 'צעיף', cost: 12 }, { key: '🎩', label: 'מגבעת', cost: 15 }, { key: '✨', label: 'נצנץ', cost: 18 }
  ];
  var PETS = [
    { key: '🐰', label: 'ארנב', cost: 25 }, { key: '🐥', label: 'אפרוח', cost: 25 },
    { key: '🐢', label: 'צב', cost: 35 }, { key: '🐱', label: 'חתול', cost: 40 }, { key: '🦄', label: 'חד-קרן', cost: 80 }
  ];
  var DECOR = [
    { key: '🌷', label: 'פרח', cost: 8 }, { key: '🍄', label: 'פטרייה', cost: 8 }, { key: '🦋', label: 'פרפר', cost: 10 },
    { key: '🌻', label: 'חמנייה', cost: 10 }, { key: '🪑', label: 'ספסל', cost: 12 }, { key: '🌳', label: 'עץ', cost: 15 },
    { key: '🌈', label: 'קשת', cost: 25 }, { key: '⛲', label: 'מזרקה', cost: 30 }
  ];
  var PET_STAGE = ['🥚', '🐣', null];
  function petGlyph(key) { var st = (S.collection.pets[key] || {}).stage || 0; return st >= 2 ? key : PET_STAGE[st]; }
  function petStageLabel(st) { return ['ביצה', 'אפרוח', 'בוגר'][st] || 'בוגר'; }

  // Deterministic, non-gambling chest economy: progress fills with real activity.
  function bumpChest(n) {
    S.rewards.chestProgress += (n || 1);
    while (S.rewards.chestProgress >= 3) { S.rewards.chestProgress -= 3; S.rewards.chests++; }
  }
  function openChest() {
    if (S.rewards.chests <= 0) return null;
    S.rewards.chests--;
    var d = DECOR.find(function (x) { return S.rewards.decor.indexOf(x.key) < 0; });
    if (d) { S.rewards.decor.push(d.key); awardStars(5, 'chest'); save(); return { type: 'decor', key: d.key, label: d.label }; }
    var a = ACCESSORIES.find(function (x) { return S.rewards.accessories.indexOf(x.key) < 0; });
    if (a) { S.rewards.accessories.push(a.key); awardStars(5, 'chest'); save(); return { type: 'acc', key: a.key, label: a.label }; }
    awardStars(15, 'chest'); save(); return { type: 'stars', key: '⭐', label: '15 כוכבים' };
  }

  var shopTab = 'pets';
  function renderShop() {
    var tabs = [['pets', '🐰 חיות'], ['decor', '🌷 גינה'], ['style', '👗 אופנה']];
    var body = '';
    if (shopTab === 'pets') {
      body = '<p class="muted">אמצי חיה והאכילי אותה בכוכבים כדי שתגדל 🥚→🐣→🐾</p><div class="grid2">' +
        PETS.map(function (it) {
          var owned = !!S.collection.pets[it.key];
          if (owned) {
            var st = S.collection.pets[it.key].stage || 0;
            return '<div class="tile"><span class="emoji">' + petGlyph(it.key) + '</span><small>' + it.label + ' · ' + petStageLabel(st) + '</small><br>' +
              (st < 2 ? '<button class="btn btn-sun btn-sm" data-feed="' + it.key + '" style="margin-top:6px">🍎 האכלה ⭐10</button>' : '<small class="muted">גדלה! 🎉</small>') + '</div>';
          }
          return '<div class="tile"><span class="emoji">🥚</span><small>' + it.label + '</small><br>' +
            '<button class="btn btn-sun btn-sm" data-adopt="' + it.key + '" data-cost="' + it.cost + '" style="margin-top:6px">⭐ ' + it.cost + '</button></div>';
        }).join('') + '</div>';
    } else if (shopTab === 'decor') {
      body = '<p class="muted">קני פריטים וסדרי אותם בגינה שלך.</p>' +
        '<button class="btn btn-primary" id="toBuilder" style="margin-bottom:10px">🏡 בונה הגינה</button>' +
        '<div class="grid2">' +
        DECOR.map(function (it) {
          var owned = S.rewards.decor.indexOf(it.key) >= 0;
          return '<div class="tile"><span class="emoji">' + it.key + '</span><small>' + it.label + '</small><br>' +
            (owned ? '<small class="muted">יש לך ✓</small>' : '<button class="btn btn-sun btn-sm" data-buydecor="' + it.key + '" data-cost="' + it.cost + '" style="margin-top:6px">⭐ ' + it.cost + '</button>') + '</div>';
        }).join('') + '</div>';
    } else {
      body = '<h3 style="margin:6px 0">דמות</h3><div class="grid2">' +
        SKINS.map(function (it) {
          var owned = it.cost === 0 || S.rewards.unlocked.indexOf(it.key) >= 0;
          var inUse = S.child.avatar === it.key;
          return '<div class="tile' + (inUse ? ' sel' : '') + '"><span class="emoji">' + it.key + '</span><small>' + it.label + '</small><br>' +
            (owned ? '<button class="btn btn-soft btn-sm" data-useav="' + it.key + '" style="margin-top:6px">' + (inUse ? 'נבחר ✓' : 'בחרי') + '</button>'
              : '<button class="btn btn-sun btn-sm" data-buyav="' + it.key + '" data-cost="' + it.cost + '" style="margin-top:6px">⭐ ' + it.cost + '</button>') + '</div>';
        }).join('') + '</div>' +
        '<h3 style="margin:12px 0 6px">אביזרים <small class="muted">(עד 2)</small></h3><div class="grid2">' +
        ACCESSORIES.map(function (it) {
          var owned = S.rewards.accessories.indexOf(it.key) >= 0;
          var on = S.child.accessories.indexOf(it.key) >= 0;
          return '<div class="tile' + (on ? ' sel' : '') + '"><span class="emoji">' + it.key + '</span><small>' + it.label + '</small><br>' +
            (owned ? '<button class="btn btn-soft btn-sm" data-toggleacc="' + it.key + '" style="margin-top:6px">' + (on ? 'מוסר' : 'ענדי') + '</button>'
              : '<button class="btn btn-sun btn-sm" data-buyacc="' + it.key + '" data-cost="' + it.cost + '" style="margin-top:6px">⭐ ' + it.cost + '</button>') + '</div>';
        }).join('') + '</div>';
    }
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card"><div class="row between"><h2 style="margin:0">🧸 חנות הצעצועים</h2><span class="pill">⭐ <span class="num">' + S.rewards.stars + '</span></span></div>' +
      (S.rewards.chests > 0 ? '<button class="btn btn-sun" id="chest" style="margin-top:10px">🎁 פתחי תיבת אוצר (' + S.rewards.chests + ')</button>' : '') +
      '<div class="tabs">' + tabs.map(function (t) { return '<button class="tab' + (shopTab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      body +
      '<button class="btn btn-primary" id="back" style="margin-top:14px">חזרה הביתה</button>' +
      '</div></div>';
    document.getElementById('back').onclick = function () { go('home'); };
    Array.prototype.forEach.call(app.querySelectorAll('.tab'), function (t) { t.onclick = function () { shopTab = t.getAttribute('data-tab'); render(); }; });
    var bb = document.getElementById('toBuilder'); if (bb) bb.onclick = function () { go('garden_builder'); };
    var ch = document.getElementById('chest'); if (ch) ch.onclick = function () {
      var r = openChest(); FX.sfx('coin'); FX.burstAt(ch, '#ffd23f', 20);
      go('celebrate', { title: '🎁 תיבת אוצר!', sub: r ? ('זכית ב' + r.label + ' ' + r.key) : 'מצוין!', earned: 0, then: 'shop' });
    };
    function buy(cost) { if (S.rewards.stars < cost) return false; S.rewards.stars -= cost; return true; }
    Array.prototype.forEach.call(app.querySelectorAll('[data-adopt]'), function (b) {
      b.onclick = function () { var k = b.getAttribute('data-adopt'); if (!buy(Number(b.getAttribute('data-cost')))) { b.textContent = 'צריך עוד ⭐'; return; } S.collection.pets[k] = { stage: 0, fed: 0 }; FX.sfx('coin'); save(); render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-feed]'), function (b) {
      b.onclick = function () { var k = b.getAttribute('data-feed'); if (!buy(10)) { b.textContent = 'צריך עוד ⭐'; return; } var pt = S.collection.pets[k]; pt.fed = (pt.fed || 0) + 1; pt.stage = pt.fed >= 4 ? 2 : pt.fed >= 2 ? 1 : 0; FX.sfx('coin'); FX.burstAt(b, '#ff7aa2', 12); save(); render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-buydecor]'), function (b) {
      b.onclick = function () { var k = b.getAttribute('data-buydecor'); if (!buy(Number(b.getAttribute('data-cost')))) { b.textContent = 'צריך עוד ⭐'; return; } S.rewards.decor.push(k); FX.sfx('coin'); save(); render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-buyav]'), function (b) {
      b.onclick = function () { var k = b.getAttribute('data-buyav'); if (!buy(Number(b.getAttribute('data-cost')))) { b.textContent = 'צריך עוד ⭐'; return; } S.rewards.unlocked.push(k); S.child.avatar = k; FX.sfx('coin'); save(); render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-useav]'), function (b) {
      b.onclick = function () { S.child.avatar = b.getAttribute('data-useav'); save(); render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-buyacc]'), function (b) {
      b.onclick = function () { var k = b.getAttribute('data-buyacc'); if (!buy(Number(b.getAttribute('data-cost')))) { b.textContent = 'צריך עוד ⭐'; return; } S.rewards.accessories.push(k); FX.sfx('coin'); save(); render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-toggleacc]'), function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-toggleacc'); var arr = S.child.accessories; var i = arr.indexOf(k);
        if (i >= 0) arr.splice(i, 1); else { if (arr.length >= 2) arr.shift(); arr.push(k); }
        save(); render();
      };
    });
  }

  /* ============================== GARDEN BUILDER ============================== */
  function renderGardenBuilder() {
    var owned = S.rewards.decor.slice();
    var sel = { key: owned[0] || null };
    var cols = 6, rows = 5;
    function cellsHTML() {
      var occ = {}; S.garden.placed.forEach(function (pl) { occ[pl.x + ',' + pl.y] = pl.key; });
      var h = '';
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var k = occ[x + ',' + y];
        h += '<button class="gb-cell" data-x="' + x + '" data-y="' + y + '">' + (k ? '<span>' + k + '</span>' : '') + '</button>';
      }
      return h;
    }
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card"><div class="row between"><h2 style="margin:0">🏡 הגינה של ' + escapeHtml(NAME()) + '</h2><button class="link" id="back">חזרה</button></div>' +
      (owned.length ? '<p class="muted">בחרי פריט ואז הקישי על משבצת. הקשה על משבצת תפוסה מנקה אותה.</p>' +
        '<div class="gb-palette" id="palette">' + owned.map(function (k, i) { return '<button class="gb-pal' + (i === 0 ? ' on' : '') + '" data-k="' + k + '">' + k + '</button>'; }).join('') +
        '<button class="gb-pal" data-k="__erase">🧽</button></div>'
        : '<p class="muted">עדיין אין פריטים. קני פריטים ב🧸 חנות הצעצועים ← גינה.</p>') +
      '<div class="gb-grid" id="grid">' + cellsHTML() + '</div>' +
      '<div class="btn-row"><button class="btn btn-soft btn-sm" id="clear">נקה הכול</button>' +
      '<button class="btn btn-primary btn-sm" id="toShop">🧸 לחנות</button></div>' +
      '</div></div>';
    document.getElementById('back').onclick = function () { go('home'); };
    document.getElementById('toShop').onclick = function () { shopTab = 'decor'; go('shop'); };
    document.getElementById('clear').onclick = function () { S.garden.placed = []; save(); render(); };
    Array.prototype.forEach.call(app.querySelectorAll('.gb-pal'), function (p) {
      p.onclick = function () { sel.key = p.getAttribute('data-k'); Array.prototype.forEach.call(app.querySelectorAll('.gb-pal'), function (q) { q.classList.remove('on'); }); p.classList.add('on'); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('.gb-cell'), function (c) {
      c.onclick = function () {
        var x = Number(c.getAttribute('data-x')), y = Number(c.getAttribute('data-y'));
        var idx = -1; for (var i = 0; i < S.garden.placed.length; i++) { if (S.garden.placed[i].x === x && S.garden.placed[i].y === y) { idx = i; break; } }
        if (sel.key === '__erase' || idx >= 0) { if (idx >= 0) { S.garden.placed.splice(idx, 1); c.innerHTML = ''; } }
        else if (sel.key) { S.garden.placed.push({ key: sel.key, x: x, y: y }); c.innerHTML = '<span>' + sel.key + '</span>'; FX.sfx('pop'); }
        save();
      };
    });
  }

  /* ============================== WORLD MAP (champion journey) ============================== */
  var LANDS = [
    { fam: 'zeros', name: 'שער ההתחלה', emoji: '🌅', story: 'שועלי פותח את שער הגן עם הזריחה. כאן הכול מתחיל — קסם האפס!' },
    { fam: 'ones', name: 'גבעת האחד', emoji: '🌄', story: 'על הגבעה גר ינשוף חכם שמלמד: כל דבר כפול אחד נשאר הוא עצמו.' },
    { fam: 'twos', name: 'יער הזוגות', emoji: '🌳', story: 'ביער הזוגות כל חיה מהלכת בזוגות. בואי נספור פעמיים-פעמיים!' },
    { fam: 'tens', name: 'מפל העשרות', emoji: '💧', story: 'המפל שופע עשרות נוצצות. סוד: רק מוסיפים אפס בסוף!' },
    { fam: 'fives', name: 'חוף החמישות', emoji: '🏖️', story: 'על החוף קופצים בחמישיות על אבני הסלע: 5, 10, 15...' },
    { fam: 'fours', name: 'מערת הארבעות', emoji: '🪨', story: 'במערה מהדהד טריק הקסם: כפול-כפול! פעמיים כפול 2.' },
    { fam: 'threes', name: 'גן השלושות', emoji: '🌸', story: 'בגן פורחים פרחים בני שלושה עלים. כל קבוצה — עוד שלוש.' },
    { fam: 'sixes', name: 'הר השישות', emoji: '⛰️', story: 'מטפסים על ההר בקבוצות של שש. אמיצה — את כבר בדרך לפסגה!' },
    { fam: 'nines', name: 'חלל התשעות', emoji: '🪐', story: 'בחלל התשעות יש טריק כוכבי: כפול עשר, ואז מורידים את המספר.' },
    { fam: 'hard', name: 'טירת האלופה', emoji: '🏰', story: 'בטירה ממתינים האתגרים הקשים. רק אלופות אמיתיות מגיעות לכאן!' }
  ];
  function renderWorldMap() {
    app.innerHTML = '<div class="screen">' + topbar(true) +
      '<div class="card"><div class="row between"><h2 style="margin:0">🗺️ המסע של ' + escapeHtml(NAME()) + '</h2><button class="link" id="back">בית</button></div>' +
      '<p class="muted">כל ארץ היא משפחת כפל. כבשי אותן בזו אחר זו!</p>' +
      '<div class="worldmap">' +
      LANDS.map(function (l, i) {
        var cov = E.familyCoverage(S.cards, l.fam);
        var unlocked = E.familyUnlocked(S.cards, l.fam);
        var done = cov >= 0.999;
        var boss = E.familyReadyForBoss(S.cards, l.fam) && S.rewards.bossDone.indexOf(l.fam) < 0;
        var stars = E.familyStars(cov);
        var toStar = E.factsToNextStar(S.cards, l.fam);
        var hint = !unlocked ? 'נפתח אחרי הארץ הקודמת' : done ? 'הושלם! 👑' : ('עוד ' + toStar + ' לכוכב הבא');
        var cls = done ? 'done' : unlocked ? 'open' : 'locked';
        return '<button class="land ' + cls + '" data-fam="' + l.fam + '" data-unlocked="' + (unlocked ? 1 : 0) + '"' + (i % 2 ? ' style="align-self:flex-end"' : '') + '>' +
          '<span class="land-emoji">' + (unlocked ? l.emoji : '🔒') + '</span>' +
          '<span class="land-name">' + l.name + '</span>' +
          (unlocked ? starsHTML(stars) : '') +
          '<span class="land-bar"><i style="width:' + Math.round(cov * 100) + '%"></i></span>' +
          '<small class="muted" style="font-size:11px">' + hint + '</small>' +
          (boss ? '<span class="land-boss">🏆 אתגר!</span>' : done ? '<span class="land-tag">👑</span>' : '') +
          '</button>';
      }).join('') +
      '</div></div></div>';
    document.getElementById('back').onclick = function () { go('home'); };
    var tp = document.getElementById('toParent'); if (tp) tp.onclick = function () { go('parent_gate', { then: 'parent_dash' }); };
    Array.prototype.forEach.call(app.querySelectorAll('.land'), function (b) {
      b.onclick = function () {
        if (b.getAttribute('data-unlocked') !== '1') { FX.sfx('wrong'); return; }
        var fam = b.getAttribute('data-fam');
        if (E.familyReadyForBoss(S.cards, fam) && S.rewards.bossDone.indexOf(fam) < 0) return startBoss(fam);
        go('land_story', { fam: fam });
      };
    });
  }
  /* Short narrative cutscene before entering a land — the "adventure" framing. */
  function renderLandStory(fam) {
    var land = null;
    for (var i = 0; i < LANDS.length; i++) if (LANDS[i].fam === fam) { land = LANDS[i]; break; }
    if (!land) return startFamilySession(fam);
    app.innerHTML = '<div class="screen center">' + FOX() +
      '<div class="card">' +
      '<div style="font-size:56px;text-align:center">' + land.emoji + '</div>' +
      '<h2 class="center" style="margin:4px 0">' + land.name + '</h2>' +
      '<p style="font-size:18px;line-height:1.6;text-align:center">' + land.story + '</p>' +
      '<button class="btn btn-primary" id="goLand">קדימה להרפתקה! 🚀</button>' +
      '<button class="link" id="backMap">חזרה למפה</button>' +
      '</div></div>';
    speak(land.name + '. ' + land.story);
    bindBtn('goLand', function () { startFamilySession(fam); });
    bindBtn('backMap', function () { go('world_map'); });
  }
  function startFamilySession(fam) {
    var pool = S.cards.filter(function (c) { return c.family === fam; });
    var due = pool.filter(function (c) { return c.state !== 'new'; });
    var newOnes = pool.filter(function (c) { return c.state === 'new'; }).slice(0, 3);
    var picks = shuffle(due).slice(0, 6).concat(newOnes);
    if (!picks.length) picks = shuffle(pool).slice(0, 6);
    var items = [];
    if (newOnes.length && C.concept && C.concept[fam]) items.push({ kind: 'concept', family: fam, concept: C.concept[fam] });
    picks.forEach(function (c) { items.push(buildItem(c, false)); });
    run = { mode: 'daily', items: items, i: 0, correct: 0, stars0: S.rewards.stars, t0: Date.now(), consecWrong: 0, fastCorrect: 0, eased: false, boosted: false, endNow: false };
    logEvent(EV.lesson_started, { count: items.length, family: fam });
    go('session');
  }

  /* ============================== TROPHY ROOM (collection · sets · buddy) ============================== */
  var SETS = [
    { id: 'pets', name: 'חיות מחמד', emoji: '🐾', items: ['🐰', '🐥', '🐢', '🐱', '🦄'] },
    { id: 'garden', name: 'גן פורח', emoji: '🌻', items: ['🌷', '🍄', '🦋', '🌻', '🪑', '🌳', '🌈', '⛲'] },
    { id: 'style', name: 'סטייל אלופה', emoji: '🎀', items: ['🎀', '🕶️', '🧣', '🎩', '✨'] }
  ];
  function setOwned(set) {
    if (set.id === 'pets') return Object.keys(S.collection.pets || {});
    if (set.id === 'garden') return S.rewards.decor || [];
    if (set.id === 'style') return S.rewards.accessories || [];
    return [];
  }
  function renderTrophies() {
    var crowns = (S.rewards.bossDone || []).map(function (f) { return '👑 ' + E.FAMILY_LABEL[f]; });
    var badges = (S.rewards.badges || []).map(function (b) { return BADGE_LABEL[b] || b; });
    var ownedPets = Object.keys(S.collection.pets || {});
    app.innerHTML = '<div class="screen">' + topbar(false) +
      '<div class="card"><div class="row between"><h2 style="margin:0">🏆 חדר הגביעים</h2><button class="link" id="back">בית</button></div>' +
      '<div class="kpi-grid" style="margin-top:8px">' +
      kpi(S.rewards.stars, 'כוכבים') +
      kpi((S.rewards.badges || []).length, 'תגים') +
      kpi(crowns.length, 'כתרי משפחות') +
      kpi((S.records && S.records.bestGameScore) || 0, 'שיא במשחק') +
      '</div></div>' +

      '<div class="card"><h3>🐾 הבן-לוויה שלי</h3>' +
      (ownedPets.length ?
        '<p class="muted">בחרי חיה שתלווה אותך במסך הבית ותעודד אותך.</p><div class="buddy-pick">' +
        ownedPets.map(function (key) {
          return '<button class="tile buddy-opt' + (S.collection.buddy === key ? ' sel' : '') + '" data-k="' + key + '"><span class="emoji">' + (petGlyph(key) || key) + '</span></button>';
        }).join('') + '</div>'
        : '<p class="muted">עדיין אין חיות. אמצי חיה ב🧸 חנות הצעצועים.</p>') +
      '</div>' +

      '<div class="card"><h3>אוספים — השלימי את הסטים!</h3>' +
      SETS.map(function (set) {
        var owned = setOwned(set);
        var have = set.items.filter(function (it) { return owned.indexOf(it) >= 0; }).length;
        return '<div style="margin-top:10px"><div class="row between"><b>' + set.emoji + ' ' + set.name + '</b>' +
          '<span class="num" style="font-weight:800">' + have + '/' + set.items.length + (have === set.items.length ? ' ✅' : '') + '</span></div>' +
          '<div class="set-row">' + set.items.map(function (it) {
            return '<span class="set-item' + (owned.indexOf(it) >= 0 ? '' : ' missing') + '">' + it + '</span>';
          }).join('') + '</div></div>';
      }).join('') +
      '<p class="muted" style="margin-top:8px">פריטים נוספים בחנות הצעצועים 🧸</p></div>' +

      '<div class="card"><h3>תגים וכתרים</h3>' +
      (badges.length || crowns.length ?
        '<div>' + crowns.concat(badges).map(function (t) { return '<span class="pill" style="margin:3px">' + t + '</span>'; }).join('') + '</div>'
        : '<p class="muted">עוד אין תגים — כל משפחה שתשלטי בה תיתן כתר! 👑</p>') +
      '</div></div>';
    bindBtn('back', function () { go('home'); });
    Array.prototype.forEach.call(app.querySelectorAll('.buddy-opt'), function (b) {
      b.onclick = function () {
        S.collection.buddy = b.getAttribute('data-k'); save(); FX.sfx('pop'); render();
      };
    });
  }

  /* ============================== PARENT GATE ============================== */
  function renderParentGate(then, onboarding) {
    var x = 17 + Math.floor(Math.random() * 30), y = 14 + Math.floor(Math.random() * 30), ans = x + y;
    app.innerHTML = '<div class="screen">' +
      '<div class="card center"><h2>👪 אזור הורים</h2>' +
      '<p class="muted">כדי להמשיך, פתרו את התרגיל (חוסם כניסת ילדים):</p>' +
      '<div class="prompt-q">' + mexpr(x + ' + ' + y + ' = ?') + '</div>' +
      '<input class="input" id="gate" inputmode="numeric" autocomplete="off" aria-label="תשובה">' +
      '<div class="err-text" id="gerr"></div>' +
      '<button class="btn btn-primary" id="enter">כניסה</button>' +
      (onboarding ? '' : '<button class="link" id="back">חזרה</button>') +
      '</div></div>';
    document.getElementById('enter').onclick = function () {
      if (Number(document.getElementById('gate').value) === ans) { go(then); }
      else { document.getElementById('gerr').textContent = 'תשובה שגויה, נסו שוב.'; }
    };
    if (!onboarding) document.getElementById('back').onclick = function () {
      // If no profile is loaded yet (e.g. came from the picker), go back there.
      go(activeProfileId ? 'home' : 'profiles');
    };
  }

  /* ============================== PARENT DASHBOARD ============================== */
  function stateClass(s) { return 's-' + s; }
  var RISK_LABEL = { lapsed: 'נשכחה', fragile: 'שברירית', due_soon: 'לחזרה בקרוב' };
  function formatDateHe(ts) { var d = new Date(ts); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  /* Newly-mastered facts per day, from the recent mastery trend in history. */
  function masteryPerDay() {
    var h = (S.history || []).filter(function (e) { return typeof e.masteryPct === 'number' && e.ts; });
    if (h.length < 2) return 0;
    var recent = h.slice(-10);
    var first = recent[0], last = recent[recent.length - 1];
    var days = Math.max(1, (last.ts - first.ts) / E.DAY);
    var gained = (last.masteryPct - first.masteryPct) * S.cards.length;
    return gained > 0 ? gained / days : 0;
  }
  /* Per-profile mastery summary for the comparison card (null if <2 profiles). */
  function profilesComparison() {
    var list = Storage.listProfiles();
    if (list.length < 2) return null;
    return list.map(function (p) {
      var st = (p.id === activeProfileId) ? S : Storage.loadProfileState(p.id);
      var cards = (st && Array.isArray(st.cards)) ? st.cards : [];
      var kk = cards.length ? E.computeKpis(cards) : { masteryPct: 0, masteredCount: 0, totalFacts: 0 };
      var rk = E.rankForPct(kk.masteryPct);
      return { id: p.id, name: p.name, avatar: p.avatar, masteryPct: kk.masteryPct,
        mastered: kk.masteredCount, rank: rk, active: p.id === activeProfileId };
    }).sort(function (a, b) { return b.masteryPct - a.masteryPct; });
  }
  function renderParentDashboard() {
    logEvent(EV.parent_dashboard_viewed, {});
    var now = Date.now();
    var k = E.computeKpis(S.cards);
    var rec = E.recommendNextAction(S.cards);
    var mins = Math.round(S.stats.totalTimeMs / 60000);
    var risk = E.forecastAtRisk(S.cards, { now: now, limit: 8 });
    var est = E.estimateMasteryDate(S.cards, { now: now, perDay: masteryPerDay() });
    var cmp = profilesComparison();

    // heatmap rows a=0..10, cols b=0..10
    var heat = '<div class="heat"><span class="h lbl">×</span>';
    for (var b = 0; b <= 10; b++) heat += '<span class="h lbl">' + b + '</span>';
    for (var a = 0; a <= 10; a++) {
      heat += '<span class="h lbl">' + a + '</span>';
      for (var bb = 0; bb <= 10; bb++) {
        var c = cardAt(a, bb);
        heat += '<span class="h ' + stateClass(c ? c.state : 'new') + '" title="' + a + '×' + bb + '"></span>';
      }
    }
    heat += '</div>';

    app.innerHTML = '<div class="screen">' +
      '<div class="row between"><h2 style="margin:0">👑 הדוח של ' + escapeHtml(NAME()) + '</h2><button class="link" id="home">חזרה</button></div>' +
      '<div class="card"><h3>המלצה</h3><p style="font-weight:700">' + rec + '</p>' +
      '<button class="btn btn-primary btn-sm" id="startNow" style="width:auto">פתחו סבב תרגול</button></div>' +

      '<div class="card"><h3>מפת שליטה</h3>' + heat +
      '<div class="legend">' +
      '<span><i style="background:#eef3ee"></i> חדש</span>' +
      '<span><i style="background:#ffe9a8"></i> בלמידה</span>' +
      '<span><i style="background:#ffd23f"></i> בתרגול</span>' +
      '<span><i style="background:#7fd49a"></i> חזק</span>' +
      '<span><i style="background:#2e9e5b"></i> שליטה</span>' +
      '<span><i style="background:#ef9a9a"></i> בסיכון</span>' +
      '</div></div>' +

      '<div class="card"><h3>מדדים</h3><div class="kpi-grid">' +
      kpi(k.masteredCount + '/' + k.totalFacts, 'עובדות בשליטה') +
      kpi(Math.round(k.mixedReviewAccuracy * 100) + '%', 'דיוק עצמאי') +
      kpi(Math.round(k.hintDependence * 100) + '%', 'תלות ברמזים') +
      kpi(Math.round(k.transferAccuracy * 100) + '%', 'יכולת העברה') +
      kpi((k.medianLatencyMs / 1000).toFixed(1) + 'ש\'', 'זמן תגובה חציוני') +
      kpi(mins + ' דק\'', 'זמן למידה כולל') +
      kpi(S.stats.sessionsCompleted, 'סבבים שהושלמו') +
      kpi(S.streak.days.length + '/5', 'ימי רצף השבוע') +
      '</div></div>' +

      '<div class="card"><h3>🔮 עובדות בסיכון</h3>' +
      (risk.length ?
        '<p class="muted">' + risk.length + ' עובדות בסיכון להישכח — סבב חזרה קצר ימנע נסיגה.</p>' +
        '<div>' + risk.map(function (r) {
          return '<span class="pill risk-' + r.reason + '" style="margin:3px;font-size:14px"><span class="mexpr">' + r.id + '</span> · ' + RISK_LABEL[r.reason] + '</span>';
        }).join('') + '</div>'
        : '<p class="muted">אין כרגע עובדות בסיכון 🎉</p>') +
      '</div>' +

      '<div class="card"><h3>📅 תחזית שליטה מלאה</h3>' +
      (k.masteredCount >= k.totalFacts ? '<p style="font-weight:700">כל הכפל בשליטה מלאה! 🏆</p>'
        : est ? '<p style="font-weight:700">בקצב הנוכחי — שליטה מלאה בעוד כ-' + est.daysRemaining + ' ימים (בערך ' + formatDateHe(est.date) + ').</p>' +
          '<small class="muted">לפי קצב של ' + est.perDay.toFixed(1) + ' עובדות חדשות בשליטה ביום. עוד ' + est.remaining + ' עובדות.</small>'
        : '<p class="muted">עוד אין מספיק נתונים לתחזית — עוד כמה סבבי תרגול והיא תופיע.</p>') +
      '</div>' +

      (cmp ? '<div class="card"><h3>👥 השוואת פרופילים</h3>' +
        cmp.map(function (p) {
          return '<div class="row between" style="margin-top:8px"><span>' + escapeHtml(p.avatar || '👑') + ' ' + escapeHtml(p.name) +
            (p.active ? ' <small class="muted">(פעיל)</small>' : '') + ' · ' + p.rank.emoji + ' ' + p.rank.name +
            '</span><span class="num" style="font-weight:800">' + Math.round(p.masteryPct * 100) + '%</span></div>' +
            '<div class="progress" style="margin-top:3px"><i style="width:' + Math.max(3, Math.round(p.masteryPct * 100)) + '%"></i></div>';
        }).join('') +
        '</div>' : '') +

      '<div class="card"><h3>מגמה לאורך זמן</h3>' + trendsHTML() + '</div>' +

      '<div class="card"><h3>דפוסי טעויות</h3>' + errorSummaryHTML() + '</div>' +

      '<div class="card"><div class="btn-row">' +
      '<button class="btn btn-soft btn-sm" id="worksheet">🖨️ דף תרגול</button>' +
      '<button class="btn btn-soft btn-sm" id="export">⬇️ ייצוא סיכום</button>' +
      '</div><div class="btn-row" style="margin-top:10px">' +
      '<button class="btn btn-soft btn-sm" id="settings">⚙️ פרטיות והגדרות</button>' +
      '<button class="btn btn-soft btn-sm" id="switchUser">👥 החלפת משתמש</button>' +
      '</div></div>' +
      '</div>';

    document.getElementById('home').onclick = function () { go('home'); };
    document.getElementById('startNow').onclick = function () { startSession('review'); };
    document.getElementById('settings').onclick = function () { go('parent_settings'); };
    document.getElementById('switchUser').onclick = function () { go('profiles'); };
    document.getElementById('export').onclick = exportSummary;
    document.getElementById('worksheet').onclick = function () { go('worksheet'); };
  }

  function sparklineSVG(values, color) {
    if (!values.length) return '<p class="muted">עדיין אין מספיק נתונים להצגת מגמה.</p>';
    var w = 280, h = 60, pad = 4;
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    var span = (max - min) || 1;
    var step = values.length > 1 ? (w - 2 * pad) / (values.length - 1) : 0;
    var pts = values.map(function (v, i) {
      var x = pad + i * step;
      var y = h - pad - ((v - min) / span) * (h - 2 * pad);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="60" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline fill="none" stroke="' + color + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"/></svg>';
  }
  function trendsHTML() {
    if (!S.history.length) return '<p class="muted">המגמה תופיע אחרי כמה סבבי תרגול.</p>';
    var last = S.history.slice(-14);
    var mastery = last.map(function (e) { return Math.round((e.masteryPct || 0) * 100); });
    var acc = last.map(function (e) { return Math.round((e.accuracy || 0) * 100); });
    return '<small style="font-weight:800">אחוז שליטה</small>' + sparklineSVG(mastery, 'var(--leaf)') +
      '<small style="font-weight:800">דיוק עצמאי</small>' + sparklineSVG(acc, 'var(--sky-blue)') +
      '<small class="muted">' + last.length + ' מדידות אחרונות</small>';
  }
  function errorSummaryHTML() {
    var tags = S.stats.errorTags || {};
    var keys = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; });
    if (!keys.length) return '<p class="muted">עדיין לא נאספו מספיק טעויות לניתוח 🎉</p>';
    var total = keys.reduce(function (s, k) { return s + tags[k]; }, 0);
    return '<p class="muted">לפי סוג הטעות שתמרי בוחרת:</p>' + keys.map(function (k) {
      var pct = Math.round(tags[k] / total * 100);
      return '<div class="row between" style="margin-top:6px"><span>' + (ERR_LABEL[k] || k) + '</span>' +
        '<span class="num" style="font-weight:800">' + tags[k] + ' (' + pct + '%)</span></div>';
    }).join('');
  }
  function kpi(big, small) { return '<div class="kpi"><b><span class="num">' + big + '</span></b><small>' + small + '</small></div>'; }
  function uniqueIds(cards) { var seen = {}, out = []; cards.forEach(function (c) { if (!seen[c.id]) { seen[c.id] = 1; out.push(c.id); } }); return out; }

  function exportSummary() {
    var k = E.computeKpis(S.cards);
    var summary = {
      generatedAt: new Date().toISOString(),
      child: { nickname: S.child.nickname, avatar: S.child.avatar },
      kpis: k,
      families: E.FAMILY_ORDER.map(function (f) { return { key: f, label: E.FAMILY_LABEL[f], coverage: +(E.familyCoverage(S.cards, f)).toFixed(2) }; }),
      fragile: S.cards.filter(function (c) { return c.state === 'at_risk'; }).map(function (c) { return c.id; }),
      stars: S.rewards.stars, badges: S.rewards.badges,
      sessions: S.stats.sessionsCompleted, learningMinutes: Math.round(S.stats.totalTimeMs / 60000),
      recommendation: E.recommendNextAction(S.cards)
    };
    var blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'gan-hakefel-summary.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ============================== WORKSHEET (printable) ============================== */
  function renderWorksheet() {
    var now = Date.now();
    var fragile = S.cards.filter(function (c) { return c.state === 'at_risk' || (c.state === 'practicing' && c.box <= 1); });
    var due = S.cards.filter(function (c) { return c.state !== 'new' && c.nextDueAt <= now; });
    var learned = S.cards.filter(function (c) { return c.state !== 'new'; });
    var byId = {}; S.cards.forEach(function (c) { byId[c.id] = c; });
    var ids = uniqueIds(fragile.concat(due).concat(shuffle(learned.slice())));
    var chosen = ids.map(function (id) { return byId[id]; }).filter(Boolean).slice(0, 20);
    if (chosen.length < 20) {
      shuffle(learned.slice()).forEach(function (c) { if (chosen.length < 20 && chosen.indexOf(c) < 0) chosen.push(c); });
    }
    if (chosen.length < 12) { // brand-new learner: give easy practice anyway
      shuffle(S.cards.filter(function (c) { return c.b >= 2 && c.b <= 5; })).forEach(function (c) { if (chosen.length < 16 && chosen.indexOf(c) < 0) chosen.push(c); });
    }
    var probs = chosen.map(function (c) { var swap = Math.random() < 0.5; var x = swap ? c.b : c.a, y = swap ? c.a : c.b; return x + ' × ' + y + ' = ____'; });
    app.innerHTML = '<div class="screen"><div class="row between"><h2 style="margin:0">דף תרגול</h2><button class="link" id="back">חזרה</button></div>' +
      '<div class="card"><p class="muted">דף להדפסה או לפתרון על נייר — מתמקד בעובדות שתמרי מתרגלת עכשיו. נהדר לזמן בלי מסך.</p>' +
      '<button class="btn btn-primary btn-sm" id="print" style="width:auto">🖨️ הדפסה</button></div>' +
      '<div class="worksheet" id="ws">' +
      '<h2 style="text-align:center;margin:0 0 4px">דף תרגול של ' + escapeHtml(NAME()) + ' 👑</h2>' +
      '<div class="ws-name">שם: ____________     תאריך: __________</div>' +
      '<div class="ws-grid">' + probs.map(function (p, i) { return '<div class="ws-item"><span class="ws-n">' + (i + 1) + '.</span> <span class="mexpr">' + p + '</span></div>'; }).join('') + '</div>' +
      '</div></div>';
    document.getElementById('back').onclick = function () { go('parent_dash'); };
    document.getElementById('print').onclick = function () { try { window.print(); } catch (e) {} };
  }

  function backupState() {
    try {
      var blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url;
      a.download = 'gan-hakefel-backup-' + todayKey() + '.json'; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      var m = document.getElementById('bkMsg'); if (m) { m.style.color = 'var(--good)'; m.textContent = 'הגיבוי נשמר.'; }
    } catch (e) { var m2 = document.getElementById('bkMsg'); if (m2) m2.textContent = 'שמירת הגיבוי נכשלה.'; }
  }
  function restoreState(text) {
    var m = document.getElementById('bkMsg');
    try {
      var s = JSON.parse(text);
      if (!s || !Array.isArray(s.cards) || s.cards.length !== 66) throw new Error('bad');
      S = migrate(s); save();
      if (m) { m.style.color = 'var(--good)'; m.textContent = 'השחזור הצליח!'; }
      setTimeout(function () { go(S.consentGiven ? 'home' : 'onb_gate'); }, 600);
    } catch (e) { if (m) { m.style.color = 'var(--bad)'; m.textContent = 'הקובץ אינו גיבוי תקין.'; } }
  }

  /* ============================== SETTINGS / PRIVACY ============================== */
  function renderSettings() {
    app.innerHTML = '<div class="screen">' +
      '<div class="row between"><h2 style="margin:0">פרטיות והגדרות</h2><button class="link" id="back">חזרה</button></div>' +
      '<div class="card"><h3>הגדרות</h3>' +
      toggleRow('sound', 'קול ואפקטים', S.settings.sound) +
      toggleRow('music', 'מוזיקת רקע', S.settings.music) +
      toggleRow('haptics', 'רטט במשחקים', S.settings.haptics) +
      toggleRow('reducedMotion', 'הפחתת אנימציות', S.settings.reducedMotion) +
      toggleRow('analytics', 'איסוף סטטיסטיקת למידה (מקומי)', S.settings.analytics) +
      toggleRow('freeEntry', 'הקלדת תשובה (לעובדות בשליטה)', S.settings.freeEntry) +
      '<div class="row between" style="margin-top:10px"><span>אורך סבב יומי</span>' +
      '<select id="len" class="input" style="width:auto;min-height:48px">' +
      [6, 8, 10, 12].map(function (n) { return '<option value="' + n + '"' + (S.settings.sessionLength === n ? ' selected' : '') + '>' + n + ' תרגילים</option>'; }).join('') +
      '</select></div>' +
      '<div class="row between" style="margin-top:10px"><span>ערכת נושא</span>' +
      '<select id="theme" class="input" style="width:auto;min-height:48px">' +
      [['auto', 'אוטומטי (עונתי)'], ['spring', 'אביב'], ['summer', 'קיץ'], ['autumn', 'סתיו'], ['winter', 'חורף']]
        .map(function (o) { return '<option value="' + o[0] + '"' + ((S.settings.theme || 'auto') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></div></div>' +

      '<div class="card"><h3>נגישות</h3>' +
      toggleRow('readAloud', 'הקראת שאלות (קול)', S.settings.readAloud) +
      toggleRow('dyslexia', 'מצב ידידותי לדיסלקציה', S.settings.dyslexia) +
      '<div class="row between" style="margin-top:10px"><span>גודל טקסט</span>' +
      '<select id="textScale" class="input" style="width:auto;min-height:48px">' +
      [['normal', 'רגיל'], ['large', 'גדול'], ['huge', 'ענק']]
        .map(function (o) { return '<option value="' + o[0] + '"' + ((S.settings.textScale || 'normal') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></div></div>' +

      '<div class="card"><h3>גיבוי ושחזור</h3>' +
      '<p class="muted">מצב מקומי בלבד — מומלץ לשמור גיבוי מדי פעם, כדי לא לאבד התקדמות אם הטאבלט יאופס.</p>' +
      '<div class="btn-row"><button class="btn btn-soft btn-sm" id="backup">⬇️ גיבוי לקובץ</button>' +
      '<button class="btn btn-soft btn-sm" id="restoreBtn">⬆️ שחזור מקובץ</button></div>' +
      '<input type="file" id="restoreFile" accept="application/json" style="display:none">' +
      '<div class="err-text" id="bkMsg"></div></div>' +

      '<div class="card"><h3>גיבוי אוטומטי</h3>' +
      '<p class="muted">המכשיר שומר תמונת-מצב יומית אוטומטית (ב-IndexedDB), ושומר עותק עמיד גם אם הדפדפן מנקה את הזיכרון. אפשר לשחזר תמונת-מצב קודמת:</p>' +
      '<button class="btn btn-soft btn-sm" id="autoBkList" style="width:auto">📜 הצג גיבויים אוטומטיים</button>' +
      '<div id="autoBkBox" style="margin-top:8px"></div></div>' +

      '<div class="card"><h3>התקנה על הטאבלט</h3>' +
      '<p class="muted">אפשר להוסיף את גן הכפל למסך הבית: בתפריט הדפדפן בחרו "הוסף למסך הבית". האפליקציה עובדת לגמרי ללא אינטרנט.</p></div>' +

      '<div class="card"><h3>סיכום פרטיות</h3>' +
      '<p>נאסף: שם חיבה, דמות, והתקדמות בלימוד — לצורך התאמת התרגול והדוח להורה.</p>' +
      '<p>לא נאסף: שם אמיתי, דוא"ל, מצלמה, מיקרופון, מיקום, אנשי קשר, תמונות או מידע ביומטרי. אין פרסומות ואין מעקב צד-שלישי.</p></div>' +

      '<div class="card"><h3>ניהול נתונים</h3>' +
      '<div class="btn-row"><button class="btn btn-soft btn-sm" id="reset">איפוס התקדמות</button>' +
      '<button class="btn btn-soft btn-sm" id="delete" style="color:var(--bad)">מחיקת כל הנתונים</button></div>' +
      '<div class="err-text" id="msg"></div></div>' +
      '</div>';

    document.getElementById('back').onclick = function () { go('parent_dash'); };
    bindToggle('sound'); bindToggle('music'); bindToggle('haptics'); bindToggle('reducedMotion'); bindToggle('analytics'); bindToggle('freeEntry');
    bindToggle('readAloud'); bindToggle('dyslexia');
    document.getElementById('len').onchange = function (e) { S.settings.sessionLength = Number(e.target.value); save(); };
    document.getElementById('theme').onchange = function (e) { S.settings.theme = e.target.value; save(); applyTheme(); };
    document.getElementById('textScale').onchange = function (e) { S.settings.textScale = e.target.value; save(); applyA11y(); };
    document.getElementById('autoBkList').onclick = function () {
      var box = document.getElementById('autoBkBox');
      box.innerHTML = '<small class="muted">טוען…</small>';
      Storage.listBackups(activeProfileId).then(function (list) {
        if (!list.length) { box.innerHTML = '<small class="muted">עדיין אין גיבויים אוטומטיים — ייווצרו אחרי סבבי תרגול.</small>'; return; }
        box.innerHTML = list.map(function (b) {
          var d = new Date(b.ts);
          var when = d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
          return '<div class="row between" style="margin-top:6px"><span>📦 ' + when + '</span>' +
            '<button class="btn btn-soft btn-sm" data-bk="' + b.id + '" style="width:auto">שחזר</button></div>';
        }).join('');
        Array.prototype.forEach.call(box.querySelectorAll('[data-bk]'), function (btn) {
          btn.onclick = function () {
            if (!confirm('לשחזר את הפרופיל לתמונת-מצב זו? המצב הנוכחי יוחלף.')) return;
            Storage.restoreBackup(activeProfileId, Number(btn.getAttribute('data-bk'))).then(function (data) {
              if (data) { S = migrate(data); save(); go(S.consentGiven ? 'home' : 'onb_gate'); }
              else { box.innerHTML = '<small class="err-text">השחזור נכשל.</small>'; }
            });
          };
        });
      });
    };
    document.getElementById('backup').onclick = backupState;
    document.getElementById('restoreBtn').onclick = function () { document.getElementById('restoreFile').click(); };
    document.getElementById('restoreFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { restoreState(reader.result); };
      reader.readAsText(f);
    };
    document.getElementById('reset').onclick = function () {
      if (!confirm('לאפס את כל ההתקדמות בלימוד? הפרופיל יישמר.')) return;
      S.cards = E.buildFactSpace(); S.rewards = { stars: 0, unlocked: [], badges: [], bossDone: [] };
      S.stats = { sessionsCompleted: 0, totalTimeMs: 0, lastSessionAt: 0, gamesPlayed: 0, arraysCorrect: 0, errorTags: {} };
      S.history = []; S.baselineDone = false; save(); document.getElementById('msg').textContent = 'ההתקדמות אופסה.';
    };
    document.getElementById('delete').onclick = function () {
      if (!confirm('למחוק לצמיתות את הנתונים של הפרופיל הזה?')) return;
      // Delete only the active profile through the storage layer. Other profiles
      // are untouched. Route to whatever makes sense for what remains.
      Storage.deleteProfile(activeProfileId);
      activeProfileId = null;
      var remaining = Storage.listProfiles();
      if (remaining.length) { go('profiles'); }
      else { S = freshState(); go('onb_gate'); }
    };
  }
  function toggleRow(key, label, on) {
    return '<div class="row between" style="margin-top:10px"><span>' + label + '</span>' +
      '<label class="switch"><input type="checkbox" id="tg_' + key + '"' + (on ? ' checked' : '') + ' aria-label="' + label + '"><span class="track"></span><span class="knob"></span></label></div>';
  }
  function bindToggle(key) {
    var el = document.getElementById('tg_' + key); if (!el) return;
    el.onchange = function () {
      S.settings[key] = el.checked; save(); applyMotionPref();
      logEvent(EV.privacy_setting_changed, { key: key, value: el.checked });
      if (key === 'sound' && el.checked) speak('הקול מופעל');
      if (key === 'music') { if (el.checked) FX.startMusic(); else FX.stopMusic(); }
      if (key === 'dyslexia') applyA11y();
      if (key === 'readAloud' && el.checked) speak('ההקראה מופעלת');
    };
  }

  /* ============================== PWA (installable, offline-by-design) ============================== */
  function installPWA() {
    try {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
        '<rect width="512" height="512" rx="96" fill="#3aa76d"/>' +
        '<path d="M128 360 L96 196 L192 276 L256 152 L320 276 L416 196 L384 360 Z" fill="#ffd23f" stroke="#f0b400" stroke-width="12" stroke-linejoin="round"/>' +
        '<rect x="120" y="360" width="272" height="40" rx="12" fill="#ffd23f"/></svg>';
      var icon = 'data:image/svg+xml,' + encodeURIComponent(svg);
      var manifest = {
        name: 'גן הכפל של תמרי', short_name: 'גן הכפל', start_url: '.', scope: '.',
        display: 'standalone', orientation: 'portrait', background_color: '#bfe6ff',
        theme_color: '#3aa76d', lang: 'he', dir: 'rtl',
        icons: [{ src: icon, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }]
      };
      var mblob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
      var link = document.createElement('link'); link.rel = 'manifest'; link.href = URL.createObjectURL(mblob); document.head.appendChild(link);
      var ati = document.createElement('link'); ati.rel = 'apple-touch-icon'; ati.href = icon; document.head.appendChild(ati);
    } catch (e) {}
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__deferredInstall = e; });
  }

  /* ============================== BOOT ============================== */
  if ('speechSynthesis' in window) { try { window.speechSynthesis.getVoices(); } catch (e) {} }
  installPWA();
  applyMotionPref();

  // 1) Migrate any legacy single-blob save into a "תמרי" profile. Idempotent
  //    and non-destructive (raw backup written first; legacy key left intact).
  Storage.migrateLegacy({ migrate: migrate, name: 'תמרי', avatar: '👑' });

  // 2) Resolve which profile (if any) to load, then route accordingly.
  bootResolveProfile();

  // Minimal bridge for tests/debugging (read-only access to the router + state).
  // Harmless in production; lets the jsdom flow test exercise every screen.
  try { window.__gankefel = { go: go, route: function () { return route; }, state: function () { return S; }, ENGINE: E }; } catch (e) {}

  // 3) Durability safety net: if localStorage was empty (e.g. evicted) but the
  //    IndexedDB mirror has data, rehydrate and re-resolve — non-blocking.
  try {
    Storage.recoverIfEmpty().then(function (restored) {
      if (restored) { Storage.migrateLegacy({ migrate: migrate, name: 'תמרי', avatar: '👑' }); bootResolveProfile(); }
    });
  } catch (e) {}

  function bootResolveProfile() {
    var activeId = Storage.getActiveProfileId();
    var profiles = Storage.listProfiles();
    if (activeId && Storage.getProfile(activeId)) {
      activeProfileId = activeId;
      S = loadActiveState();
      applyTheme(); applyA11y();
      logEvent(EV.app_open, {}); save();
      if (S.consentGiven && S.baselineDone && checkLogin()) { go('daily_gift'); }
      else { go(S.consentGiven ? 'home' : 'onb_gate'); }
    } else if (profiles.length === 0) {
      // Fresh install: onboarding will create the first profile.
      activeProfileId = null; S = freshState();
      go('onb_gate');
    } else {
      // Profiles exist but none is active: show the profile picker.
      activeProfileId = null; S = freshState();
      go('profiles');
    }
  }
})();
