/* Engine regression tests — the pure learning core must keep behaving. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE as E } from '../src/engine.js';

test('buildFactSpace produces the 66-card fact space', () => {
  const cards = E.buildFactSpace();
  assert.equal(cards.length, 66);
  // every card has an id, a family and starts "new"
  for (const c of cards) {
    assert.ok(c.id, 'card has id');
    assert.ok(E.FAMILY_ORDER.includes(c.family), 'card family is known');
    assert.equal(c.state, 'new');
  }
});

test('factId is order-independent (commutative facts share a card)', () => {
  assert.equal(E.factId(3, 4), E.factId(4, 3));
});

test('gradeAttempt is pure and advances an independent correct answer', () => {
  const cards = E.buildFactSpace();
  const card = cards.find((c) => c.family === 'twos' && c.b >= 2);
  const now = 1_000_000;
  const before = card.box;
  const res = E.gradeAttempt(card, { correct: true, latencyMs: 1200, usedHint: false, isTransfer: false, now });
  // pure: original untouched, new card returned
  assert.equal(card.box, before, 'input card is not mutated');
  assert.ok(res.box > before, 'box advances on an independent correct answer');
  assert.ok(res.attempts === card.attempts + 1, 'attempt counted on the result');
  assert.equal(res.state, 'practicing');
});

test('buildSession returns a bounded, valid session', () => {
  const cards = E.buildFactSpace();
  const session = E.buildSession(cards, { now: Date.now(), length: 8 });
  assert.ok(Array.isArray(session));
  assert.ok(session.length <= 8 + 3, 'respects the requested length (plus new-intro budget)');
});

test('computeKpis reports totals over the fact space', () => {
  const cards = E.buildFactSpace();
  const k = E.computeKpis(cards);
  assert.equal(k.totalFacts, 66);
  assert.equal(k.masteredCount, 0);
});

test('rankForPct maps mastery to the right champion rank + progress', () => {
  assert.equal(E.rankForPct(0).key, 'seed');
  assert.equal(E.rankForPct(0).index, 0);
  assert.equal(E.rankForPct(0.5).key, 'star');
  assert.equal(E.rankForPct(1).key, 'world');
  assert.equal(E.rankForPct(1).isMax, true);
  // halfway between seed(0) and sprout(0.10) is ~0.5 progress
  const r = E.rankForPct(0.05);
  assert.equal(r.key, 'seed');
  assert.ok(Math.abs(r.progressToNext - 0.5) < 1e-9);
  assert.equal(r.next.key, 'sprout');
});

test('familyStars + factsToNextStar reflect coverage', () => {
  assert.equal(E.familyStars(0), 0);
  assert.equal(E.familyStars(0.5), 1);
  assert.equal(E.familyStars(0.7), 2);
  assert.equal(E.familyStars(1), 3);
  const cards = E.buildFactSpace();
  const fam = E.FAMILY_ORDER.find((f) => cards.some((c) => c.family === f));
  const need = E.factsToNextStar(cards, fam);
  assert.ok(need >= 1, 'a fresh family needs at least one fact for its first star');
});

test('buildJourney describes every family in order', () => {
  const cards = E.buildFactSpace();
  const j = E.buildJourney(cards);
  assert.equal(j.length, E.FAMILY_ORDER.length);
  assert.equal(j[0].key, E.FAMILY_ORDER[0]);
  for (const node of j) {
    assert.ok('stars' in node && 'coverage' in node && 'unlocked' in node);
    assert.ok(node.stars >= 0 && node.stars <= 3);
  }
});

test('forecastAtRisk ranks lapsed > fragile > due_soon', () => {
  const now = 10 * E.DAY;
  const cards = E.buildFactSpace();
  const lapsed = cards[0]; lapsed.state = 'at_risk'; lapsed.nextDueAt = now - E.DAY;
  const fragile = cards[1]; fragile.state = 'practicing'; fragile.box = 1; fragile.nextDueAt = now + 5 * E.DAY;
  const dueSoon = cards[2]; dueSoon.state = 'strong'; dueSoon.box = 3; dueSoon.nextDueAt = now + E.DAY;
  const safe = cards[3]; safe.state = 'mastered'; safe.box = 5; safe.nextDueAt = now + 20 * E.DAY;

  const risk = E.forecastAtRisk(cards, { now });
  const ids = risk.map((r) => r.id);
  assert.equal(risk[0].id, lapsed.id);
  assert.equal(risk[0].reason, 'lapsed');
  assert.ok(ids.indexOf(fragile.id) < ids.indexOf(dueSoon.id), 'fragile outranks due_soon');
  assert.ok(ids.indexOf(safe.id) === -1, 'a comfortably-scheduled mastered fact is not at risk');
  // limit is respected
  assert.equal(E.forecastAtRisk(cards, { now, limit: 1 }).length, 1);
});

test('buildAdditionProblem respects max / carry / two-digit constraints', () => {
  for (let i = 0; i < 400; i++) {
    const p = E.buildAdditionProblem({ max: 100 });
    assert.ok(p.sum <= 100 && p.sum === p.a + p.b && p.a >= 1 && p.b >= 1, 'basic bounds');
  }
  for (let i = 0; i < 200; i++) {
    const p = E.buildAdditionProblem({ max: 100, requireCarry: true, twoDigit: true });
    assert.ok(p.a >= 10 && p.b >= 10, 'two-digit addends');
    assert.equal((p.a % 10) + (p.b % 10) >= 10, true, 'units carry');
    assert.equal(p.carry, 1);
  }
  // Impossible constraints must still never violate sum <= max.
  for (let i = 0; i < 50; i++) {
    const p = E.buildAdditionProblem({ max: 15, requireCarry: true, twoDigit: true });
    assert.ok(p.sum <= 15 && p.sum === p.a + p.b && p.a >= 1 && p.b >= 1, 'range guaranteed under impossible constraints');
  }
});

test('additionChoices: 4 unique options including the correct sum', () => {
  for (let i = 0; i < 200; i++) {
    const sum = 1 + Math.floor(Math.random() * 100);
    const ch = E.additionChoices(sum);
    assert.equal(ch.length, 4);
    assert.ok(ch.includes(sum), 'includes the answer');
    assert.equal(new Set(ch).size, 4, 'all unique');
    ch.forEach((v) => assert.ok(v >= 0 && v <= 199));
  }
});

test('loginRewardForDay escalates and caps', () => {
  assert.equal(E.loginRewardForDay(0), 0);
  assert.equal(E.loginRewardForDay(1), 2);
  assert.ok(E.loginRewardForDay(7) >= E.loginRewardForDay(3));
  assert.equal(E.loginRewardForDay(30), E.loginRewardForDay(7), 'caps after day 7');
});

test('pickWeeklyChallenge is deterministic per week and valid', () => {
  const a = E.pickWeeklyChallenge('2026-25');
  const b = E.pickWeeklyChallenge('2026-25');
  assert.deepEqual(a, b, 'same week => same challenge');
  assert.ok(E.WEEKLY_CHALLENGES.includes(a));
  assert.ok('target' in a && 'kind' in a);
});

test('seasonalTheme maps months to seasons', () => {
  assert.equal(E.seasonalTheme(0), 'winter');
  assert.equal(E.seasonalTheme(6), 'summer');
  assert.equal(E.seasonalTheme(3), 'spring');
  assert.equal(E.seasonalTheme(9), 'autumn');
});

test('hebrewNumberWords spells the worksheet examples', () => {
  assert.equal(E.hebrewNumberWords(159), 'מאה חמישים ותשע');
  assert.equal(E.hebrewNumberWords(20), 'עשרים');
  assert.equal(E.hebrewNumberWords(100), 'מאה');
  assert.equal(E.hebrewNumberWords(23), 'עשרים ושלוש');
  assert.equal(E.hebrewNumberWords(215), 'מאתיים וחמש עשרה');
  assert.equal(E.hebrewNumberWords(305), 'שלוש מאות וחמש');
  assert.equal(E.hebrewNumberWords(999), 'תשע מאות תשעים ותשע');
  assert.equal(E.hebrewNumberWords(0), 'אפס');
});

test('every grade-3 generator produces a well-formed, correct question', () => {
  const keys = E.G3_TOPICS.map((t) => t.key).concat(['mix']);
  for (const key of keys) {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < 60; i++) {
        const q = E.buildG3Question(key, Math.random, level);
        assert.ok(q && typeof q.prompt === 'string' && q.prompt.length > 0, 'prompt: ' + key);
        assert.ok(q.answer !== undefined && q.answer !== null, 'answer: ' + key + ' / ' + q.type);
        if (q.input === 'choice') {
          assert.ok(Array.isArray(q.choices) && q.choices.length >= 2, 'choices present: ' + q.type);
          assert.ok(q.choices.indexOf(q.answer) >= 0, 'answer in choices: ' + q.type);
          assert.equal(new Set(q.choices.map(String)).size, q.choices.length, 'choices unique: ' + q.type);
        } else {
          assert.equal(typeof q.answer, 'number', 'numeric answer: ' + q.type);
          assert.ok(isFinite(q.answer) && q.answer >= 0, 'finite non-negative answer: ' + q.type + ' = ' + q.answer);
        }
      }
    }
  }
});

test('grade-3 arithmetic answers are actually correct', () => {
  for (let i = 0; i < 400; i++) {
    const q = E.buildG3Question('arithmetic', Math.random, (i % 3) + 1);
    const m = q.prompt.match(/^(\d+) ([+−×:]) (\d+) =$/); // single-op only
    if (!m) continue;
    const a = +m[1], b = +m[3];
    if (m[2] === '+') assert.equal(q.answer, a + b);
    if (m[2] === '−') assert.equal(q.answer, a - b);
    if (m[2] === '×') assert.equal(q.answer, a * b);
    if (m[2] === ':') assert.equal(q.answer, a / b);
  }
});

test('estimateMasteryDate needs a positive pace and projects forward', () => {
  const cards = E.buildFactSpace();
  cards.slice(0, 6).forEach((c) => { c.state = 'mastered'; });
  const now = 1_000_000_000;
  assert.equal(E.estimateMasteryDate(cards, { now, perDay: 0 }), null);
  const est = E.estimateMasteryDate(cards, { now, perDay: 2 });
  assert.equal(est.remaining, 60);
  assert.equal(est.daysRemaining, 30);
  assert.equal(est.date, now + 30 * E.DAY);
  // all mastered => done
  cards.forEach((c) => { c.state = 'mastered'; });
  assert.equal(E.estimateMasteryDate(cards, { now, perDay: 1 }).done, true);
});
