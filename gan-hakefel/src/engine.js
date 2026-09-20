/* ============================================================================
 * src/engine.js — gan-hakefel learning engine (ESM module)
 * Extracted verbatim from the baseline single-file app. Pure, deterministic,
 * side-effect-free. Time is always injected (now). Imported by the app
 * (browser) and by the Node test suite.
 * ==========================================================================*/

/* ============================================================================
 * גן הכפל — מנוע למידה טהור (engine)
 * Pure, deterministic, side-effect-free. Time is always injected (`now`).
 * Used both by the app (browser) and by the Node test suite.
 * ==========================================================================*/

var DAY = 24 * 60 * 60 * 1000;

/* Spaced-repetition boxes -> interval in days.
 * box 0 = same session (short re-visit), then 1,3,7,14,30 days. */
var INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
var SAME_SESSION_MS = 90 * 1000; // box 0 re-appears later in the same session
var STRONG_BOX = 3;   // reaching the 7-day box => "strong"
var MASTERY_BOX = 5;  // 30-day box + transfer => "mastered"
var MAX_NEW_PER_SESSION = 3;

/* Family introduction order. Each fact is assigned to the EARLIEST applicable
 * strategy family, so it is introduced at the right moment in the curriculum. */
var FAMILY_ORDER = [
  'zeros', 'ones', 'twos', 'tens', 'fives',
  'fours', 'threes', 'sixes', 'nines', 'hard'
];

var FAMILY_LABEL = {
  zeros: 'כפל באפס',
  ones: 'כפל באחד',
  twos: 'כפל בשתיים',
  tens: 'כפל בעשר',
  fives: 'כפל בחמש',
  fours: 'כפל בארבע',
  threes: 'כפל בשלוש',
  sixes: 'כפל בשש',
  nines: 'כפל בתשע',
  hard: 'המשפחות הקשות (7 ו-8)'
};

/* Which operand triggers which family (checked in FAMILY_ORDER order). */
function familyOf(a, b) {
  if (a === 0 || b === 0) return 'zeros';
  if (a === 1 || b === 1) return 'ones';
  if (a === 2 || b === 2) return 'twos';
  if (a === 10 || b === 10) return 'tens';
  if (a === 5 || b === 5) return 'fives';
  if (a === 4 || b === 4) return 'fours';
  if (a === 3 || b === 3) return 'threes';
  if (a === 6 || b === 6) return 'sixes';
  if (a === 9 || b === 9) return 'nines';
  return 'hard'; // remaining: both operands in {7,8}
}

function familyIndex(key) { return FAMILY_ORDER.indexOf(key); }

/* Canonical id: smaller operand first, so 3×7 and 7×3 collapse to one card. */
function factId(a, b) {
  var lo = Math.min(a, b), hi = Math.max(a, b);
  return lo + '×' + hi;
}

/* The full fact space: canonical pairs a<=b, both in 0..10 (all products <=100). */
function buildFactSpace() {
  var cards = [];
  for (var a = 0; a <= 10; a++) {
    for (var b = a; b <= 10; b++) {
      cards.push(newFactCard(a, b));
    }
  }
  return cards;
}

function newFactCard(a, b) {
  var lo = Math.min(a, b), hi = Math.max(a, b);
  return {
    id: factId(lo, hi),
    a: lo, b: hi,
    product: lo * hi,
    family: familyOf(lo, hi),
    state: 'new',          // new | learning | practicing | strong | mastered | at_risk
    box: 0,
    attempts: 0,
    correct: 0,
    independentCorrect: 0,
    hintCount: 0,
    latencies: [],         // recent response times (ms)
    lastSeenAt: 0,
    nextDueAt: 0,
    lapseCount: 0,
    transferSuccess: 0,    // correct independent answers on transfer items
    consecErrors: 0
  };
}

function median(arr) {
  if (!arr.length) return 0;
  var s = arr.slice().sort(function (x, y) { return x - y; });
  var m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function nextDueFrom(box, now) {
  if (box <= 0) return now + SAME_SESSION_MS;
  return now + INTERVAL_DAYS[box] * DAY;
}

/* Core grading. Returns a NEW card object (pure). `opts`:
 *   correct (bool), usedHint (bool), latencyMs (number),
 *   isTransfer (bool), now (ms) */
function gradeAttempt(card, opts) {
  var c = JSON.parse(JSON.stringify(card));
  var now = opts.now;
  c.attempts += 1;
  c.lastSeenAt = now;
  if (typeof opts.latencyMs === 'number') {
    c.latencies.push(opts.latencyMs);
    if (c.latencies.length > 20) c.latencies.shift();
  }
  if (c.state === 'new') c.state = 'learning';

  if (opts.correct) {
    c.correct += 1;
    if (opts.usedHint) {
      // Correct WITH help: counts as correct, never as independent mastery.
      c.hintCount += 1;
      c.consecErrors = 0;
      // No box advance; revisit again soon (same session).
      c.box = Math.max(0, Math.min(c.box, STRONG_BOX - 1));
    } else {
      c.independentCorrect += 1;
      c.consecErrors = 0;
      if (opts.isTransfer) c.transferSuccess += 1;
      c.box = Math.min(c.box + 1, MASTERY_BOX);
      if (c.state === 'learning' || c.state === 'at_risk') c.state = 'practicing';
      else if (c.state === 'new') c.state = 'practicing';
      if (c.box >= STRONG_BOX && (c.state === 'practicing')) c.state = 'strong';
      // Final mastery requires top box AND a passed transfer item.
      if (c.box >= MASTERY_BOX && c.transferSuccess > 0 && c.independentCorrect >= 3) {
        c.state = 'mastered';
      }
    }
  } else {
    if (opts.usedHint) c.hintCount += 1;
    c.consecErrors += 1;
    if (c.state === 'mastered' || c.state === 'strong') {
      c.lapseCount += 1;
      c.state = 'at_risk';
    } else if (c.state !== 'at_risk') {
      c.state = 'practicing';
    }
    c.box = Math.max(c.box - 1, 0);
  }
  c.nextDueAt = nextDueFrom(c.box, now);
  return c;
}

/* After 2 consecutive errors (or while new/learning) present a visual scaffold. */
function chooseScaffold(card) {
  return card.consecErrors >= 2 || card.state === 'new' || card.state === 'learning';
}

/* A family is "known enough" when >=60% of its facts are strong/mastered. */
function familyCoverage(cards, key) {
  var fam = cards.filter(function (c) { return c.family === key; });
  if (!fam.length) return 1;
  var good = fam.filter(function (c) { return c.state === 'strong' || c.state === 'mastered'; });
  return good.length / fam.length;
}

/* Introduce new facts only from the lowest family whose prerequisites are met. */
function familyUnlocked(cards, key) {
  var idx = familyIndex(key);
  for (var i = 0; i < idx; i++) {
    if (familyCoverage(cards, FAMILY_ORDER[i]) < 0.6) return false;
  }
  return true;
}

/* The single family from which new facts should currently be drawn. */
function activeIntroFamily(cards) {
  for (var i = 0; i < FAMILY_ORDER.length; i++) {
    var key = FAMILY_ORDER[i];
    var hasNew = cards.some(function (c) { return c.family === key && c.state === 'new'; });
    if (hasNew && familyUnlocked(cards, key)) return key;
  }
  return null;
}

/* A family is ripe for a "champion boss challenge": mostly learned (>=80%)
 * but not yet fully mastered, and its prerequisites are met. */
function familyReadyForBoss(cards, key) {
  var cov = familyCoverage(cards, key);
  return familyUnlocked(cards, key) && cov >= 0.8 && cov < 0.999;
}

/* Build a session item list using the 60/20/10/10 mix with graceful fallback.
 * Returns array of { card, pool } in presentation order. */
function buildSession(cards, opts) {
  opts = opts || {};
  var now = opts.now || Date.now();
  var length = opts.length || 10;
  var mix = opts.mix || { due: 0.6, fragile: 0.2, fresh: 0.1, easy: 0.1 };

  var byId = {};
  cards.forEach(function (c) { byId[c.id] = c; });

  var due = cards.filter(function (c) {
    return c.state !== 'new' && c.nextDueAt <= now;
  }).sort(function (x, y) { return x.nextDueAt - y.nextDueAt; });

  var fragile = cards.filter(function (c) {
    return c.state === 'at_risk' ||
      (c.state === 'practicing' && c.box <= 1) ||
      c.consecErrors > 0;
  });

  var introFam = activeIntroFamily(cards);
  var fresh = introFam
    ? cards.filter(function (c) { return c.state === 'new' && c.family === introFam; })
    : [];

  var easy = cards.filter(function (c) {
    return c.state === 'strong' || c.state === 'mastered';
  }).sort(function (x, y) { return x.nextDueAt - y.nextDueAt; });

  var want = {
    due: Math.round(length * mix.due),
    fragile: Math.round(length * mix.fragile),
    fresh: Math.min(Math.round(length * mix.fresh), MAX_NEW_PER_SESSION),
    easy: Math.round(length * mix.easy)
  };

  var picked = [];
  var seen = {};
  function take(pool, poolName, n) {
    for (var i = 0; i < pool.length && n > 0; i++) {
      var c = pool[i];
      if (seen[c.id]) continue;
      seen[c.id] = true;
      picked.push({ card: c, pool: poolName });
      n--;
    }
  }
  take(due, 'due', want.due);
  take(fragile, 'fragile', want.fragile);
  take(fresh, 'fresh', want.fresh);
  take(easy, 'easy', want.easy);

  // Fill any shortfall from the most useful remaining pools, in priority order.
  var fillers = [].concat(due, fragile, easy, fresh);
  for (var i = 0; i < fillers.length && picked.length < length; i++) {
    var c = fillers[i];
    if (seen[c.id]) continue;
    seen[c.id] = true;
    picked.push({ card: c, pool: 'fill' });
  }
  return picked.slice(0, length);
}

/* Product-level KPIs for the parent dashboard / analytics. */
function computeKpis(cards) {
  var introduced = cards.filter(function (c) { return c.state !== 'new'; });
  var attempts = introduced.reduce(function (s, c) { return s + c.attempts; }, 0);
  var indep = introduced.reduce(function (s, c) { return s + c.independentCorrect; }, 0);
  var hints = introduced.reduce(function (s, c) { return s + c.hintCount; }, 0);
  var mastered = cards.filter(function (c) { return c.state === 'mastered'; });
  var atRisk = cards.filter(function (c) { return c.state === 'at_risk'; });
  var transfer = cards.filter(function (c) { return c.transferSuccess > 0; });
  var lats = [];
  introduced.forEach(function (c) { lats = lats.concat(c.latencies); });

  return {
    totalFacts: cards.length,
    introducedCount: introduced.length,
    masteredCount: mastered.length,
    atRiskCount: atRisk.length,
    mixedReviewAccuracy: attempts ? +(indep / attempts).toFixed(3) : 0,
    hintDependence: attempts ? +(hints / attempts).toFixed(3) : 0,
    transferAccuracy: introduced.length ? +(transfer.length / introduced.length).toFixed(3) : 0,
    medianLatencyMs: median(lats),
    masteryPct: cards.length ? +(mastered.length / cards.length).toFixed(3) : 0
  };
}

/* One concrete recommended next action for the parent. */
function recommendNextAction(cards) {
  var atRisk = cards.filter(function (c) { return c.state === 'at_risk'; });
  if (atRisk.length) {
    return 'יש ' + atRisk.length + ' עובדות שצריך לרענן. כדאי סבב חזרה קצר היום.';
  }
  var introFam = activeIntroFamily(cards);
  if (introFam) {
    return 'מוכנים להתקדם ל' + FAMILY_LABEL[introFam] + '.';
  }
  var dueSoon = cards.filter(function (c) { return c.state !== 'new'; });
  if (dueSoon.length === cards.length) return 'כל העובדות נלמדות! ממשיכים בחזרות לשימור.';
  return 'ממשיכים בקצב — תרגול יומי קצר שומר על השליטה.';
}

/* ============================================================================
 * Visible progression: champion rank ladder + per-family star ratings.
 * Pure + deterministic, so the UI can render a clear "where am I / what's next"
 * picture and the app can fire a celebration exactly when a rank is crossed.
 * ==========================================================================*/

/* Overall champion ranks, keyed by fraction of the fact space mastered. */
var RANKS = [
  { key: 'seed',   name: 'זרע',         emoji: '🌱', min: 0 },
  { key: 'sprout', name: 'נבט',         emoji: '🌿', min: 0.10 },
  { key: 'bud',    name: 'ניצן',        emoji: '🌷', min: 0.25 },
  { key: 'star',   name: 'כוכבת',       emoji: '⭐', min: 0.45 },
  { key: 'hero',   name: 'גיבורה',      emoji: '🦸', min: 0.65 },
  { key: 'champ',  name: 'אלופה',       emoji: '👑', min: 0.85 },
  { key: 'world',  name: 'אלופת העולם', emoji: '🏆', min: 1.0 }
];

/* Resolve a mastery fraction (0..1) to a rank + progress toward the next one. */
function rankForPct(pct) {
  pct = Math.max(0, Math.min(1, pct || 0));
  var idx = 0;
  for (var i = 0; i < RANKS.length; i++) { if (pct >= RANKS[i].min) idx = i; }
  var cur = RANKS[idx];
  var next = RANKS[idx + 1] || null;
  var progressToNext = 1;
  if (next) {
    var span = next.min - cur.min;
    progressToNext = span > 0 ? Math.max(0, Math.min(1, (pct - cur.min) / span)) : 1;
  }
  return {
    index: idx, key: cur.key, name: cur.name, emoji: cur.emoji,
    pct: pct, isMax: !next,
    next: next ? { key: next.key, name: next.name, emoji: next.emoji, at: next.min } : null,
    progressToNext: progressToNext
  };
}

/* Convenience: rank straight from a card array. */
function rankForCards(cards) { return rankForPct(computeKpis(cards).masteryPct); }

/* Per-family star rating (0..3) from coverage thresholds. */
function familyStars(coverage) {
  if (coverage >= 0.999) return 3;
  if (coverage >= 0.67) return 2;
  if (coverage >= 0.34) return 1;
  return 0;
}

/* How many more facts in this family must reach strong/mastered to earn the
 * next star (0 if already at 3 stars). Exact, counted from the cards. */
var STAR_THRESHOLDS = [0.34, 0.67, 0.999];
function factsToNextStar(cards, key) {
  var fam = cards.filter(function (c) { return c.family === key; });
  if (!fam.length) return 0;
  var good = fam.filter(function (c) { return c.state === 'strong' || c.state === 'mastered'; }).length;
  var stars = familyStars(good / fam.length);
  if (stars >= 3) return 0;
  var need = Math.ceil(STAR_THRESHOLDS[stars] * fam.length);
  return Math.max(1, need - good);
}

/* A render-ready description of the whole journey, family by family. */
function buildJourney(cards) {
  var active = activeIntroFamily(cards);
  return FAMILY_ORDER.map(function (key) {
    var fam = cards.filter(function (c) { return c.family === key; });
    var mastered = fam.filter(function (c) { return c.state === 'mastered'; }).length;
    var cov = familyCoverage(cards, key);
    return {
      key: key, label: FAMILY_LABEL[key],
      total: fam.length, mastered: mastered,
      coverage: cov, stars: familyStars(cov),
      unlocked: familyUnlocked(cards, key),
      active: key === active,
      readyForBoss: familyReadyForBoss(cards, key),
      toNextStar: factsToNextStar(cards, key)
    };
  });
}

/* ============================================================================
 * Predictive helpers for the parent dashboard.
 * ==========================================================================*/

/* Facts most at risk of being forgotten, ranked. Reasons:
 *   'lapsed'   — already slipped to at_risk
 *   'fragile'  — practicing but shaky (low box / recent errors)
 *   'due_soon' — strong/practicing whose review falls due within the horizon
 * opts: { now, horizonMs (default 3 days), limit } */
function forecastAtRisk(cards, opts) {
  opts = opts || {};
  var now = opts.now || Date.now();
  var horizon = typeof opts.horizonMs === 'number' ? opts.horizonMs : 3 * DAY;
  var out = [];
  cards.forEach(function (c) {
    if (c.state === 'new') return;
    var score = 0, reason = null;
    if (c.state === 'at_risk') { score = 100; reason = 'lapsed'; }
    else if (c.consecErrors > 0 || (c.state === 'practicing' && c.box <= 1)) { score = 70; reason = 'fragile'; }
    else if (c.nextDueAt <= now + horizon) {
      var overdueDays = Math.max(0, (now - c.nextDueAt) / DAY);
      score = 40 + Math.min(20, overdueDays);
      reason = 'due_soon';
    }
    if (reason) {
      out.push({ id: c.id, a: c.a, b: c.b, product: c.product, family: c.family,
        state: c.state, reason: reason, score: score, nextDueAt: c.nextDueAt });
    }
  });
  out.sort(function (x, y) { return y.score - x.score || x.nextDueAt - y.nextDueAt; });
  return opts.limit ? out.slice(0, opts.limit) : out;
}

/* Estimate when the whole fact space will be mastered, given a mastery pace.
 * opts: { now, perDay } where perDay = facts newly mastered per day (>0).
 * Returns null when there is not enough signal (perDay <= 0). */
function estimateMasteryDate(cards, opts) {
  opts = opts || {};
  var now = opts.now || Date.now();
  var total = cards.length;
  var mastered = cards.filter(function (c) { return c.state === 'mastered'; }).length;
  var remaining = total - mastered;
  if (remaining <= 0) return { done: true, remaining: 0, daysRemaining: 0, date: now, perDay: opts.perDay || 0 };
  var perDay = opts.perDay || 0;
  if (perDay <= 0) return null;
  var days = Math.ceil(remaining / perDay);
  return { done: false, remaining: remaining, daysRemaining: days, date: now + days * DAY, perDay: perDay };
}

/* ============================================================================
 * Addition practice (a separate activity from the multiplication mastery
 * system). Pure generators so the content is deterministic under an injected
 * RNG and fully testable.
 * ==========================================================================*/

/* A valid addition problem with sum <= max. opts:
 *   rng (default Math.random), max (default 100), minSum (default 2),
 *   requireCarry (units must carry), twoDigit (both addends >= 10).
 * Returns { a, b, sum, carry } where carry is 1 when the units column carries. */
function buildAdditionProblem(opts) {
  opts = opts || {};
  var rng = opts.rng || Math.random;
  var max = opts.max || 100;
  var minSum = opts.minSum || 2;
  var requireCarry = !!opts.requireCarry;
  var twoDigit = !!opts.twoDigit;
  var lo = twoDigit ? 10 : 1;
  var a = lo, b = lo, sum = lo + lo, guard = 0;
  do {
    a = lo + Math.floor(rng() * (max - lo));
    b = lo + Math.floor(rng() * (max - lo));
    sum = a + b;
    guard++;
  } while (guard < 300 && (
    sum > max || sum < minSum ||
    (requireCarry && ((a % 10) + (b % 10) < 10)) ||
    (twoDigit && (a < 10 || b < 10))
  ));
  // Guarantee the hard invariant (sum within [minSum, max]) even when the
  // requested constraints are impossible to satisfy — carry/two-digit are
  // best-effort, the range is not.
  if (sum > max || sum < minSum) {
    a = 1;
    b = Math.min(max - 1, Math.max(1, minSum - 1));
    sum = a + b;
  }
  return { a: a, b: b, sum: sum, carry: ((a % 10) + (b % 10) >= 10) ? 1 : 0 };
}

/* Four answer options for an addition sum, with diagnostic distractors
 * (forgot-to-carry = sum-10, extra-carry = sum+10, off-by-1/2). Pure given rng. */
function additionChoices(sum, rng) {
  rng = rng || Math.random;
  function shuf(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  var set = {}; set[sum] = 1; var distract = [];
  function add(x) { x = Math.round(x); if (x >= 0 && x <= 199 && !set[x]) { set[x] = 1; distract.push(x); } }
  shuf([sum - 10, sum + 10, sum + 1, sum - 1, sum + 2, sum - 2]).forEach(add);
  var picks = [sum].concat(distract.slice(0, 3));
  var n = sum + 3; while (picks.length < 4) { if (n >= 0 && picks.indexOf(n) < 0) picks.push(n); n++; }
  return shuf(picks);
}

/* ============================================================================
 * Engagement helpers (daily goal, login rewards, weekly challenge, theming).
 * Pure + deterministic — testable, and easy to tune in one place.
 * ==========================================================================*/

var DAILY_GOAL_DEFAULT = 10;

/* Stars for the Nth consecutive login day; escalates, then caps at 15. */
function loginRewardForDay(day) {
  var table = [0, 2, 3, 5, 8, 10, 12, 15]; // index = day number (1..7)
  if (day <= 0) return 0;
  return day < table.length ? table[day] : 15;
}

/* Rotating weekly challenge, chosen deterministically from the week key so it
 * is stable within a week and reloads, but changes week to week. */
var WEEKLY_CHALLENGES = [
  { id: 'correct50', label: 'ענו נכון על 50 תרגילים השבוע', target: 50, kind: 'correct', emoji: '🎯' },
  { id: 'sessions5', label: 'השלימו 5 סבבי תרגול השבוע', target: 5, kind: 'sessions', emoji: '📚' },
  { id: 'games7', label: 'שחקו 7 משחקים השבוע', target: 7, kind: 'games', emoji: '🎮' },
  { id: 'master3', label: 'הגיעו לשליטה ב-3 עובדות חדשות', target: 3, kind: 'mastered', emoji: '👑' },
  { id: 'practice20', label: 'פתרו 20 תרגילי חיבור / מילוליות', target: 20, kind: 'practice', emoji: '📝' }
];
function hashStr(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return Math.abs(h); }
function pickWeeklyChallenge(weekKey) { return WEEKLY_CHALLENGES[hashStr(weekKey) % WEEKLY_CHALLENGES.length]; }

/* Seasonal theme key from a Gregorian month (0-11). */
function seasonalTheme(month) {
  if (month === 11 || month === 0 || month === 1) return 'winter'; // Dec-Feb
  if (month >= 5 && month <= 7) return 'summer';                   // Jun-Aug
  if (month >= 2 && month <= 4) return 'spring';                   // Mar-May
  return 'autumn';                                                 // Sep-Nov
}

/* ============================================================================
 * Grade-3 practice generators (מיפוי תחילת שנה) — a broad, endless bank of
 * exercises modelled on real 3rd-grade worksheets: place value, number words,
 * predecessor/successor, comparison, sequences, number line, the four
 * operations, missing-number / inverse, word problems, geometry and data.
 * All pure: each generator takes an rng and returns a normalized question
 *   { type, prompt, speak, visual?, input:'number'|'choice', answer, choices?, unit? }
 * ==========================================================================*/
function g3rnd(rng, lo, hi) { return lo + Math.floor((rng || Math.random)() * (hi - lo + 1)); }
function g3shuffle(rng, arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor((rng || Math.random)() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
function g3choices(rng, answer, distractors) {
  var set = {}, out = [answer]; set[String(answer)] = 1;
  g3shuffle(rng, distractors);
  for (var i = 0; i < distractors.length && out.length < 4; i++) { var d = distractors[i]; if (d != null && !set[String(d)]) { set[String(d)] = 1; out.push(d); } }
  return g3shuffle(rng, out);
}
function g3lv(level, a, b, c) { return level <= 1 ? a : (level >= 3 ? c : b); }

/* Hebrew number words 0..9999 (feminine counting form, as in the worksheets). */
var HE_ONES_F = ['אפס', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];
var HE_TEENS_F = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'];
var HE_TENS = ['', 'עשר', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'];
var HE_HUNDREDS = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות'];
var HE_THOUSANDS = ['', 'אלף', 'אלפיים', 'שלושת אלפים', 'ארבעת אלפים', 'חמשת אלפים', 'ששת אלפים', 'שבעת אלפים', 'שמונת אלפים', 'תשעת אלפים'];
function hebrewNumberWords(n) {
  n = Math.max(0, Math.min(9999, Math.floor(n)));
  if (n === 0) return 'אפס';
  var th = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100), rem = n % 100, tok = [];
  if (th > 0) tok.push(HE_THOUSANDS[th]);
  if (h > 0) tok.push(HE_HUNDREDS[h]);
  if (rem > 0) {
    if (rem < 10) tok.push(HE_ONES_F[rem]);
    else if (rem < 20) tok.push(HE_TEENS_F[rem - 10]);
    else { var t = Math.floor(rem / 10), u = rem % 10; tok.push(HE_TENS[t]); if (u > 0) tok.push(HE_ONES_F[u]); }
  }
  if (tok.length === 1) return tok[0];
  return tok.slice(0, -1).join(' ') + ' ו' + tok[tok.length - 1];
}

/* ---- numbers ---- */
function gNumWords(rng, lv) {
  var min = g3lv(lv, 11, 100, 1000), max = g3lv(lv, 99, 999, 9999), n = g3rnd(rng, min, max);
  var cand = [n + 1, n - 1, n + 10, n - 10, n + 100, n - 100, n + 2].filter(function (x) { return x >= 0 && x <= 9999 && x !== n; });
  return { type: 'numwords', prompt: 'איך כותבים את המספר ' + n + ' במילים?', speak: 'איך כותבים את המספר ' + n, input: 'choice', answer: hebrewNumberWords(n), choices: g3choices(rng, hebrewNumberWords(n), cand.map(hebrewNumberWords)) };
}
function gWordsToNum(rng, lv) {
  var min = g3lv(lv, 11, 100, 1000), max = g3lv(lv, 99, 999, 9999), n = g3rnd(rng, min, max);
  return { type: 'wordstonum', prompt: 'איזה מספר זה: "' + hebrewNumberWords(n) + '"?', speak: 'איזה מספר זה', input: 'number', answer: n };
}
function gPredSucc(rng, lv) {
  var max = g3lv(lv, 99, 999, 9999), n = g3rnd(rng, g3lv(lv, 11, 101, 1001), max - 1), after = g3rnd(rng, 0, 1) === 1;
  return { type: 'predsucc', prompt: 'איזה מספר בא ' + (after ? 'אחרי' : 'לפני') + ' ' + n + '?', speak: 'איזה מספר בא ' + (after ? 'אחרי' : 'לפני') + ' ' + n, input: 'number', answer: after ? n + 1 : n - 1 };
}
function gCompare(rng, lv) {
  var max = g3lv(lv, 99, 999, 9999), a = g3rnd(rng, 10, max), b = g3rnd(rng, 0, 3) === 0 ? a : g3rnd(rng, 10, max);
  return { type: 'compare', prompt: 'איזה סימן מתאים?   ' + a + '   ⬚   ' + b, speak: 'איזה סימן מתאים בין ' + a + ' ל ' + b, input: 'choice', choices: ['<', '>', '='], answer: a > b ? '>' : a < b ? '<' : '=' };
}
function gPlaceValue(rng, lv) {
  var names = ['האחדות', 'העשרות', 'המאות', 'האלפים'];
  var digits = g3lv(lv, 2, 3, 4), n = g3rnd(rng, Math.pow(10, digits - 1), Math.pow(10, digits) - 1), which = g3rnd(rng, 0, digits - 1);
  var dig = Math.floor(n / Math.pow(10, which)) % 10;
  return { type: 'placevalue', prompt: 'מהי ספרת ' + names[which] + ' במספר ' + n + '?', speak: 'מהי ספרת ' + names[which] + ' במספר ' + n, input: 'number', answer: dig };
}
function gExpandedForm(rng, lv) {
  var digits = g3lv(lv, 2, 3, 4), parts = [], val = 0;
  for (var p = digits - 1; p >= 0; p--) { var d = (p === digits - 1) ? g3rnd(rng, 1, 9) : g3rnd(rng, 0, 9); if (d > 0) parts.push(d * Math.pow(10, p)); val += d * Math.pow(10, p); }
  return { type: 'expanded', prompt: parts.join(' + ') + ' =', speak: 'חברו את הערכים', input: 'number', answer: val };
}
function gFormNumber(rng, lv) {
  var count = g3lv(lv, 2, 3, 4), ds = g3shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, count), big = g3rnd(rng, 0, 1) === 1;
  var sorted = ds.slice().sort(function (x, y) { return x - y; });
  return { type: 'formnum', prompt: 'מהו המספר ה' + (big ? 'גדול' : 'קטן') + ' ביותר שאפשר להרכיב מהספרות ' + ds.join(', ') + '?', speak: 'הרכיבו את המספר ה' + (big ? 'גדול' : 'קטן') + ' ביותר', input: 'number', answer: Number((big ? sorted.slice().reverse() : sorted).join('')) };
}
function gRound(rng, lv) {
  var base = g3lv(lv, 10, 100, (g3rnd(rng, 0, 1) ? 10 : 100)), n = g3rnd(rng, base + 1, base * (base === 10 ? 20 : 10));
  return { type: 'round', prompt: 'עגלו את ' + n + ' ל' + (base === 10 ? 'עשרת' : 'מאה') + ' הקרובה', speak: 'עגלו את ' + n, input: 'number', answer: Math.round(n / base) * base };
}
function gEvenOdd(rng, lv) {
  var n = g3rnd(rng, 2, g3lv(lv, 50, 200, 999));
  return { type: 'evenodd', prompt: 'האם ' + n + ' זוגי או אי-זוגי?', speak: 'האם ' + n + ' זוגי או אי זוגי', input: 'choice', choices: ['זוגי', 'אי-זוגי'], answer: n % 2 === 0 ? 'זוגי' : 'אי-זוגי' };
}
function gMissDigitCompare(rng, lv) {
  // Fill the missing tens digit so the inequality holds; asked as the largest /
  // smallest digit that fits, so the answer is unique. (Worksheet Q2.)
  var u = g3rnd(rng, 0, 9), d = g3rnd(rng, 1, 8);
  if (g3rnd(rng, 0, 1) === 0) {
    var N = d * 10 + u + g3rnd(rng, 1, 10); // d0..d9 boundary → largest fitting tens digit is d
    return { type: 'missdigit', prompt: 'מהי הספרה הגדולה ביותר שמתאימה?   ⬚' + u + ' < ' + N, speak: 'מהי הספרה הגדולה ביותר שמתאימה', input: 'number', answer: d };
  }
  var d2 = g3rnd(rng, 1, 9), N2 = d2 * 10 + u - g3rnd(rng, 1, 10);
  return { type: 'missdigit', prompt: 'מהי הספרה הקטנה ביותר שמתאימה?   ⬚' + u + ' > ' + N2, speak: 'מהי הספרה הקטנה ביותר שמתאימה', input: 'number', answer: d2 };
}

/* ---- sequences ---- */
function gSequence(rng, lv) {
  var opts = g3lv(lv, [1, 2, 5, 10], [10, 20, 50, 100], [100, 250, 500, 1000]);
  var step = opts[g3rnd(rng, 0, opts.length - 1)]; if (g3rnd(rng, 0, 1) === 0) step = -step;
  var len = 5, startMin = step < 0 ? Math.abs(step) * (len - 1) : 0, startMax = step > 0 ? 9999 - step * (len - 1) : 9999;
  var start = g3rnd(rng, Math.max(0, startMin), Math.max(Math.max(0, startMin), Math.min(9999, startMax)));
  var terms = [], i; for (i = 0; i < len; i++) terms.push(start + step * i);
  var blank = g3rnd(rng, 0, len - 1);
  return { type: 'sequence', prompt: 'השלימו את הסדרה:   ' + terms.map(function (t, idx) { return idx === blank ? '___' : t; }).join(' , '), speak: 'השלימו את הסדרה', input: 'number', answer: terms[blank] };
}
function gSeqRule(rng, lv) {
  var opts = g3lv(lv, [1, 2, 5, 10], [10, 20, 50, 100], [100, 250, 500, 1000]);
  var step = opts[g3rnd(rng, 0, opts.length - 1)], dir = g3rnd(rng, 0, 1) === 0 ? -1 : 1;
  var start = g3rnd(rng, dir < 0 ? step * 4 : 0, dir < 0 ? 9999 : 9999 - step * 4);
  var terms = []; for (var i = 0; i < 4; i++) terms.push(start + dir * step * i);
  var sign = dir < 0 ? '−' : '+', ans = sign + step;
  var other = opts.filter(function (o) { return o !== step; });
  var dist = [(dir < 0 ? '+' : '−') + step, '+' + other[0], '−' + other[0]];
  return { type: 'seqrule', prompt: 'מהו הכלל של הסדרה?   ' + terms.join(' , '), speak: 'מהו הכלל של הסדרה', input: 'choice', choices: g3choices(rng, ans, dist), answer: ans };
}

/* ---- number line ---- */
function gNumLineRead(rng, lv) {
  var max = g3lv(lv, 20, 100, 1000), idx = g3rnd(rng, 1, 9), val = idx * (max / 10);
  return { type: 'numline', prompt: 'איזה מספר מסומן על ישר המספרים?', speak: 'איזה מספר מסומן', visual: { kind: 'numline', min: 0, max: max, mark: val }, input: 'number', answer: val };
}
function gNumLineApprox(rng, lv) {
  var base = g3lv(lv, 10, 10, 100), max = base * 10, n = g3rnd(rng, 1, max - 1), near = Math.round(n / base) * base;
  var ticks = []; for (var t = 0; t <= max; t += base) ticks.push(t);
  return { type: 'numapprox', prompt: 'לאיזה מספר עגול הכי קרוב ' + n + '?', speak: 'לאיזה מספר קרוב ' + n, input: 'choice', answer: near, choices: g3choices(rng, near, ticks.filter(function (x) { return x !== near; })) };
}

/* ---- arithmetic ---- */
function gAdd(rng, lv) { var max = g3lv(lv, 100, 1000, 10000), a = g3rnd(rng, g3lv(lv, 10, 100, 1000), Math.floor(max * 0.7)), b = g3rnd(rng, g3lv(lv, 5, 50, 500), max - a); return { type: 'add', prompt: a + ' + ' + b + ' =', speak: 'כמה זה ' + a + ' ועוד ' + b, input: 'number', answer: a + b }; }
function gSub(rng, lv) { var max = g3lv(lv, 100, 1000, 10000), a = g3rnd(rng, Math.floor(max * 0.4), max), b = g3rnd(rng, g3lv(lv, 5, 20, 200), a); return { type: 'sub', prompt: a + ' − ' + b + ' =', speak: 'כמה זה ' + a + ' פחות ' + b, input: 'number', answer: a - b }; }
function gMul(rng, lv) { var hi = g3lv(lv, 5, 10, 12), a = g3rnd(rng, 2, hi), b = g3rnd(rng, 2, hi); return { type: 'mul', prompt: a + ' × ' + b + ' =', speak: 'כמה זה ' + a + ' כפול ' + b, input: 'number', answer: a * b }; }
function gDiv(rng, lv) { var hi = g3lv(lv, 5, 10, 12), b = g3rnd(rng, 2, hi), q = g3rnd(rng, 2, hi); return { type: 'div', prompt: (b * q) + ' : ' + b + ' =', speak: 'כמה זה ' + (b * q) + ' חלקי ' + b, input: 'number', answer: q }; }
function gChain(rng, lv) { var cnt = g3lv(lv, 3, 3, 4), hi = g3lv(lv, 30, 60, 200), s = 0, parts = []; for (var i = 0; i < cnt; i++) { var x = g3rnd(rng, 3, hi); parts.push(x); s += x; } return { type: 'chain', prompt: parts.join(' + ') + ' =', speak: 'חברו את המספרים', input: 'number', answer: s }; }
function gTwoStep(rng, lv) { var hi = g3lv(lv, 20, 60, 200), a = g3rnd(rng, 10, hi), b = g3rnd(rng, 5, hi), c = g3rnd(rng, 1, a + b - 1); return { type: 'twostep', prompt: a + ' + ' + b + ' − ' + c + ' =', speak: 'פתרו שלב אחר שלב', input: 'number', answer: a + b - c }; }
function gMulTenHundred(rng, lv) { var f = g3lv(lv, 10, 10, 100), a = g3rnd(rng, 2, g3lv(lv, 9, 20, 99)); return { type: 'multen', prompt: a + ' × ' + f + ' =', speak: 'כמה זה ' + a + ' כפול ' + f, input: 'number', answer: a * f }; }

/* ---- missing number / inverse ---- */
function gMissAdd(rng, lv) { var hi = g3lv(lv, 40, 90, 500), a = g3rnd(rng, 5, hi), s = a + g3rnd(rng, 5, hi); return { type: 'missadd', prompt: a + ' + ___ = ' + s, speak: 'מהו המספר החסר', input: 'number', answer: s - a }; }
function gMissSub(rng, lv) {
  var hi = g3lv(lv, 30, 60, 300);
  if (g3rnd(rng, 0, 1)) { var b = g3rnd(rng, 5, hi), c = g3rnd(rng, 5, hi); return { type: 'misssub', prompt: '___ − ' + b + ' = ' + c, speak: 'מהו המספר החסר', input: 'number', answer: b + c }; }
  var a = g3rnd(rng, 20, hi + 40), c2 = g3rnd(rng, 1, a - 1); return { type: 'misssub', prompt: a + ' − ___ = ' + c2, speak: 'מהו המספר החסר', input: 'number', answer: a - c2 };
}
function gMissFactor(rng, lv) { var hi = g3lv(lv, 5, 10, 12), a = g3rnd(rng, 2, hi), q = g3rnd(rng, 2, hi); return { type: 'missfac', prompt: a + ' × ___ = ' + (a * q), speak: 'מהו הגורם החסר', input: 'number', answer: q }; }
function gMissDiv(rng, lv) { var hi = g3lv(lv, 5, 10, 12), b = g3rnd(rng, 2, hi), q = g3rnd(rng, 2, hi); return { type: 'missdiv', prompt: '___ : ' + b + ' = ' + q, speak: 'מהו המספר החסר', input: 'number', answer: b * q }; }
function gBalance(rng, lv) { var hi = g3lv(lv, 20, 30, 80), x = g3rnd(rng, 1, hi), a = g3rnd(rng, 5, hi), sum = a + x, b = g3rnd(rng, 1, sum - 1), c = sum - b; return { type: 'balance', prompt: a + ' + ___ = ' + b + ' + ' + c, speak: 'השלימו כדי לאזן', input: 'number', answer: x }; }
function gFactFamily(rng, lv) {
  if (g3rnd(rng, 0, 1) === 0) {
    var hi = g3lv(lv, 40, 90, 500), a = g3rnd(rng, 5, hi), b = g3rnd(rng, 5, hi), c = a + b;
    return { type: 'factfam', prompt: 'ידוע ש-' + a + ' + ' + b + ' = ' + c + '.  השלימו:  ' + c + ' − ' + a + ' = ___', speak: 'היעזרו בתרגיל הפתור', input: 'number', answer: b };
  }
  var m = g3lv(lv, 5, 10, 12), x = g3rnd(rng, 2, m), y = g3rnd(rng, 2, m), p = x * y;
  return { type: 'factfam', prompt: 'ידוע ש-' + x + ' × ' + y + ' = ' + p + '.  השלימו:  ' + p + ' : ' + x + ' = ___', speak: 'היעזרו בתרגיל הפתור', input: 'number', answer: y };
}

/* ---- word problems ---- */
function gWordAdd(rng, lv) {
  var hi = g3lv(lv, 40, 80, 400), a = g3rnd(rng, 8, hi), b = g3rnd(rng, 8, hi);
  var t = ['לתמרי ' + a + ' מדבקות והיא קיבלה עוד ' + b + '. כמה מדבקות יש לה עכשיו?',
    'בגינה ' + a + ' פרחים אדומים ו-' + b + ' צהובים. כמה פרחים בסך הכול?',
    'באוטובוס ' + a + ' ילדים, ובתחנה עלו עוד ' + b + '. כמה ילדים באוטובוס?',
    'בכיתה א\' ' + a + ' תלמידים ובכיתה ב\' ' + b + '. כמה תלמידים בשתי הכיתות?'][g3rnd(rng, 0, 3)];
  return { type: 'wordadd', prompt: t, speak: 'בעיה מילולית', input: 'number', answer: a + b };
}
function gWordSub(rng, lv) {
  var hi = g3lv(lv, 60, 99, 500), a = g3rnd(rng, 30, hi), b = g3rnd(rng, 5, a - 1);
  var t = ['לאורי היו ' + a + ' שקלים והוא קנה ספר ב-' + b + '. כמה נשאר לו?',
    'בכיתה ' + a + ' תלמידים, ' + b + ' יצאו להפסקה. כמה נשארו?',
    'עדו קנה ספר ב-' + a + ' שקלים ואורי ב-' + b + '. בכמה יקר יותר הספר של עדו?',
    'בקופסה ' + a + ' עוגיות, אכלו ' + b + '. כמה נשארו?'][g3rnd(rng, 0, 3)];
  return { type: 'wordsub', prompt: t, speak: 'בעיה מילולית', input: 'number', answer: a - b };
}
function gWordMul(rng, lv) {
  var hi = g3lv(lv, 5, 10, 12), a = g3rnd(rng, 2, hi), b = g3rnd(rng, 2, hi);
  var t = ['ב-' + a + ' סלים יש ' + b + ' תפוחים בכל אחד. כמה תפוחים בסך הכול?',
    'ל-' + a + ' ילדים יש ' + b + ' בלונים לכל אחד. כמה בלונים יחד?',
    'בכל שורה ' + b + ' כיסאות, ויש ' + a + ' שורות. כמה כיסאות?'][g3rnd(rng, 0, 2)];
  return { type: 'wordmul', prompt: t, speak: 'בעיה מילולית', input: 'number', answer: a * b };
}
function gWordDiv(rng, lv) {
  var hi = g3lv(lv, 5, 9, 12), b = g3rnd(rng, 2, hi), q = g3rnd(rng, 2, hi), tot = b * q;
  var t = ['לאיתן ' + tot + ' מדבקות. הוא מדביק ' + b + ' בכל דף. לכמה דפים יזדקק?',
    'חילקו ' + tot + ' עוגיות שווה בשווה ל-' + b + ' ילדים. כמה קיבל כל ילד?',
    tot + ' תלמידים מתחלקים לקבוצות של ' + b + '. כמה קבוצות?'][g3rnd(rng, 0, 2)];
  return { type: 'worddiv', prompt: t, speak: 'בעיה מילולית', input: 'number', answer: q };
}
function gWordTwoStep(rng, lv) {
  var p = g3rnd(rng, 2, g3lv(lv, 4, 6, 9)), q = g3rnd(rng, 2, g3lv(lv, 5, 8, 10)), give = g3rnd(rng, 1, p * q - 1);
  return { type: 'wordtwo', prompt: 'קנו ' + p + ' חבילות של ' + q + ' עפרונות, ונתנו ' + give + ' לחברים. כמה עפרונות נשארו?', speak: 'בעיה בשני שלבים', input: 'number', answer: p * q - give };
}

/* ---- geometry ---- */
function gShapeSides(rng, lv) {
  var shapes = g3lv(lv, [['משולש', 3], ['ריבוע', 4], ['מלבן', 4]], [['משולש', 3], ['ריבוע', 4], ['מלבן', 4], ['מחומש', 5]], [['משולש', 3], ['ריבוע', 4], ['מלבן', 4], ['מחומש', 5], ['משושה', 6], ['מתומן', 8]]);
  var s = shapes[g3rnd(rng, 0, shapes.length - 1)];
  return { type: 'shapeid', prompt: 'כמה צלעות יש ל' + s[0] + '?', speak: 'כמה צלעות יש ל' + s[0], input: 'number', answer: s[1] };
}
function gShapeName(rng, lv) {
  var map = [['משולש', 3], ['מרובע', 4], ['מחומש', 5], ['משושה', 6]], s = map[g3rnd(rng, 0, g3lv(lv, 2, 3, 3))];
  return { type: 'shapename', prompt: 'לצורה עם ' + s[1] + ' צלעות קוראים...', speak: 'איך קוראים לצורה עם ' + s[1] + ' צלעות', input: 'choice', answer: s[0], choices: g3choices(rng, s[0], map.map(function (m) { return m[0]; })) };
}
function gRectGeom(rng, lv) {
  var hi = g3lv(lv, 4, 6, 10), w = g3rnd(rng, 2, hi), h = g3rnd(rng, 2, hi), area = g3rnd(rng, 0, 1) === 1;
  return { type: 'geom', prompt: (area ? 'מה שטח המלבן?' : 'מה היקף המלבן?') + ' (כל משבצת 1 ס"מ)', speak: area ? 'מה שטח המלבן' : 'מה היקף המלבן', visual: { kind: 'grid', w: w, h: h }, input: 'number', answer: area ? w * h : 2 * (w + h), unit: area ? 'סמ"ר' : 'ס"מ' };
}
function gPolyGeom(rng, lv) {
  var k = g3lv(lv, 4, 6, 8), cells = [[0, 0]], seen = { '0,0': 1 }, guard = 0;
  while (cells.length < k && guard < 200) {
    guard++;
    var base = cells[g3rnd(rng, 0, cells.length - 1)], dirs = g3shuffle(rng, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
    for (var d = 0; d < dirs.length; d++) { var nx = base[0] + dirs[d][0], ny = base[1] + dirs[d][1], key = nx + ',' + ny; if (!seen[key]) { seen[key] = 1; cells.push([nx, ny]); break; } }
  }
  var minx = 0, miny = 0, maxx = 0, maxy = 0;
  cells.forEach(function (c) { if (c[0] < minx) minx = c[0]; if (c[1] < miny) miny = c[1]; if (c[0] > maxx) maxx = c[0]; if (c[1] > maxy) maxy = c[1]; });
  var norm = cells.map(function (c) { return [c[0] - minx, c[1] - miny]; });
  var perim = 0; norm.forEach(function (c) { var nb = 0; norm.forEach(function (o) { if ((o[0] === c[0] && Math.abs(o[1] - c[1]) === 1) || (o[1] === c[1] && Math.abs(o[0] - c[0]) === 1)) nb++; }); perim += 4 - nb; });
  var area = g3rnd(rng, 0, 1) === 1;
  return { type: 'poly', prompt: (area ? 'מה שטח הצורה?' : 'מה היקף הצורה?') + ' (כל משבצת 1 ס"מ)', speak: area ? 'מה שטח הצורה' : 'מה היקף הצורה', visual: { kind: 'poly', cells: norm, w: maxx - minx + 1, h: maxy - miny + 1 }, input: 'number', answer: area ? norm.length : perim, unit: area ? 'סמ"ר' : 'ס"מ' };
}

/* ---- data ---- */
function gBarChart(rng, lv) {
  var pool = [['אדום', '🟥'], ['כחול', '🟦'], ['צהוב', '🟨'], ['ירוק', '🟩']];
  var ncat = g3lv(lv, 3, 3, 4), cats = pool.slice(0, ncat), hiv = g3lv(lv, 5, 8, 12), vals = cats.map(function () { return g3rnd(rng, 1, hiv); });
  var visual = { kind: 'bars', cats: cats.map(function (c) { return c[1]; }), labels: cats.map(function (c) { return c[0]; }), vals: vals };
  var mode = g3rnd(rng, 0, 3), hi = 0, lo = 0, i;
  for (i = 1; i < vals.length; i++) { if (vals[i] > vals[hi]) hi = i; if (vals[i] < vals[lo]) lo = i; }
  if (mode === 0) return { type: 'chart', prompt: 'כמה בסך הכול לפי הגרף?', speak: 'כמה בסך הכול', visual: visual, input: 'number', answer: vals.reduce(function (s, v) { return s + v; }, 0) };
  if (mode === 1) return { type: 'chart', prompt: 'בכמה גדול ' + cats[hi][0] + ' מ' + cats[lo][0] + '?', speak: 'בכמה גדול', visual: visual, input: 'number', answer: vals[hi] - vals[lo] };
  if (mode === 2) return { type: 'chart', prompt: 'מי הכי גדול בגרף?', speak: 'מי הכי גדול', visual: visual, input: 'choice', answer: cats[hi][0], choices: g3choices(rng, cats[hi][0], cats.map(function (c) { return c[0]; })) };
  return { type: 'chart', prompt: 'מי הכי קטן בגרף?', speak: 'מי הכי קטן', visual: visual, input: 'choice', answer: cats[lo][0], choices: g3choices(rng, cats[lo][0], cats.map(function (c) { return c[0]; })) };
}
function gPictograph(rng, lv) {
  var per = g3lv(lv, 1, 1, 2), icons = ['🍎', '🍌', '🍇'], rows = icons.map(function (ic, i) { return { label: ['תפוחים', 'בננות', 'ענבים'][i], icon: ic, count: g3rnd(rng, 1, 6) }; });
  var visual = { kind: 'pict', rows: rows, per: per, icon: '🟢' };
  if (g3rnd(rng, 0, 1) === 0) return { type: 'pict', prompt: 'כמה פירות בסך הכול לפי הדיאגרמה? (כל ' + rows[0].icon + ' = ' + per + ')', speak: 'כמה בסך הכול', visual: visual, input: 'number', answer: rows.reduce(function (s, r) { return s + r.count * per; }, 0) };
  var r = rows[g3rnd(rng, 0, rows.length - 1)];
  return { type: 'pict', prompt: 'כמה ' + r.label + ' יש? (כל ' + r.icon + ' = ' + per + ')', speak: 'כמה ' + r.label, visual: visual, input: 'number', answer: r.count * per };
}

var G3_TOPICS = [
  { key: 'numbers', label: 'מספרים', emoji: '🔢', gens: [gNumWords, gWordsToNum, gPredSucc, gCompare, gMissDigitCompare, gPlaceValue, gExpandedForm, gFormNumber, gRound, gEvenOdd] },
  { key: 'sequences', label: 'סדרות', emoji: '➡️', gens: [gSequence, gSeqRule] },
  { key: 'numberline', label: 'ישר המספרים', emoji: '📏', gens: [gNumLineRead, gNumLineApprox] },
  { key: 'arithmetic', label: 'חשבון + − × :', emoji: '➗', gens: [gAdd, gSub, gMul, gDiv, gChain, gTwoStep, gMulTenHundred] },
  { key: 'missing', label: 'מספר חסר', emoji: '❓', gens: [gMissAdd, gMissSub, gMissFactor, gMissDiv, gBalance, gFactFamily] },
  { key: 'word', label: 'בעיות מילוליות', emoji: '📖', gens: [gWordAdd, gWordSub, gWordMul, gWordDiv, gWordTwoStep] },
  { key: 'geometry', label: 'גאומטריה', emoji: '📐', gens: [gShapeSides, gShapeName, gRectGeom, gPolyGeom] },
  { key: 'data', label: 'גרפים', emoji: '📊', gens: [gBarChart, gPictograph] }
];
function g3Topic(key) { for (var i = 0; i < G3_TOPICS.length; i++) if (G3_TOPICS[i].key === key) return G3_TOPICS[i]; return null; }
function buildG3Question(key, rng, level) {
  level = level || 2;
  var gens;
  if (key === 'mix') { gens = []; G3_TOPICS.forEach(function (t) { gens = gens.concat(t.gens); }); }
  else { var t = g3Topic(key); if (!t) return null; gens = t.gens; }
  var q = gens[g3rnd(rng, 0, gens.length - 1)](rng, level);
  if (!q.input) q.input = 'number';
  q.level = level;
  return q;
}

var ENGINE = {
  DAY: DAY,
  INTERVAL_DAYS: INTERVAL_DAYS,
  SAME_SESSION_MS: SAME_SESSION_MS,
  STRONG_BOX: STRONG_BOX,
  MASTERY_BOX: MASTERY_BOX,
  FAMILY_ORDER: FAMILY_ORDER,
  FAMILY_LABEL: FAMILY_LABEL,
  RANKS: RANKS,
  familyOf: familyOf,
  familyIndex: familyIndex,
  factId: factId,
  buildFactSpace: buildFactSpace,
  newFactCard: newFactCard,
  median: median,
  nextDueFrom: nextDueFrom,
  gradeAttempt: gradeAttempt,
  chooseScaffold: chooseScaffold,
  familyCoverage: familyCoverage,
  familyUnlocked: familyUnlocked,
  activeIntroFamily: activeIntroFamily,
  familyReadyForBoss: familyReadyForBoss,
  buildSession: buildSession,
  computeKpis: computeKpis,
  recommendNextAction: recommendNextAction,
  rankForPct: rankForPct,
  rankForCards: rankForCards,
  familyStars: familyStars,
  factsToNextStar: factsToNextStar,
  buildJourney: buildJourney,
  forecastAtRisk: forecastAtRisk,
  estimateMasteryDate: estimateMasteryDate,
  buildAdditionProblem: buildAdditionProblem,
  additionChoices: additionChoices,
  DAILY_GOAL_DEFAULT: DAILY_GOAL_DEFAULT,
  WEEKLY_CHALLENGES: WEEKLY_CHALLENGES,
  loginRewardForDay: loginRewardForDay,
  pickWeeklyChallenge: pickWeeklyChallenge,
  seasonalTheme: seasonalTheme,
  hebrewNumberWords: hebrewNumberWords,
  G3_TOPICS: G3_TOPICS,
  g3Topic: g3Topic,
  buildG3Question: buildG3Question
};

export { ENGINE };
export default ENGINE;
