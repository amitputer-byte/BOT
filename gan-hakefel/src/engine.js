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
  additionChoices: additionChoices
};

export { ENGINE };
export default ENGINE;
