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
