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
