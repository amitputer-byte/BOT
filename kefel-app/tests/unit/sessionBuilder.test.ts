import { buildSession, DEFAULT_MIX } from '@/features/engine/sessionBuilder';
import { factDeck } from '@/features/engine/facts';
import { initialMastery, gradeAttempt } from '@/features/engine/mastery';
import type { MasteryState } from '@/data/schemas';
import { makeRng } from '@/lib/random';
import { DAY } from '@/lib/time';

function emptyStates(): Map<string, MasteryState> {
  return new Map();
}

describe('session builder', () => {
  it('introduces only frontier new facts at a cold start', () => {
    const items = buildSession(emptyStates(), 0, makeRng(7), { targetItems: 6 });
    expect(items.length).toBeGreaterThan(0);
    // Cold start has nothing due/fragile/easy, so everything is "new".
    expect(items.every((i) => i.source === 'new')).toBe(true);
    // The earliest introduced facts (×0/×1 family) come first.
    expect(items[0].factId).toMatch(/^0x|^1x/);
  });

  it('prioritises due reviews and respects the target size', () => {
    const states = emptyStates();
    const now = 100 * DAY;
    // Make a handful of facts overdue.
    for (const card of factDeck().slice(0, 10)) {
      let s = gradeAttempt(initialMastery('c', card.id), {
        correct: true,
        usedHint: false,
        scaffolded: false,
        isTransferItem: false,
        latencyMs: 2000,
      }, now - 40 * DAY).next;
      // Force it due in the past.
      s = { ...s, nextDueAt: now - DAY };
      states.set(card.id, s);
    }
    const items = buildSession(states, now, makeRng(3), { targetItems: 8 });
    expect(items).toHaveLength(8);
    const dueCount = items.filter((i) => i.source === 'due').length;
    expect(dueCount).toBeGreaterThanOrEqual(Math.round(8 * DEFAULT_MIX.due) - 2);
  });

  it('switches a shaky fact to a scaffolded item', () => {
    const states = emptyStates();
    const now = 10 * DAY;
    const card = factDeck()[20];
    let s = initialMastery('c', card.id);
    s = gradeAttempt(s, { correct: false, usedHint: false, scaffolded: false, isTransferItem: false, latencyMs: 6000 }, now - 2 * DAY).next;
    s = gradeAttempt(s, { correct: false, usedHint: false, scaffolded: false, isTransferItem: false, latencyMs: 6000 }, now - DAY).next;
    s = { ...s, nextDueAt: now - 1000 }; // make it due
    states.set(card.id, s);
    const items = buildSession(states, now, makeRng(5), { targetItems: 4 });
    const item = items.find((i) => i.factId === card.id);
    expect(item?.kind).toBe('scaffolded');
  });

  it('is deterministic for a fixed seed', () => {
    const a = buildSession(emptyStates(), 0, makeRng(11), { targetItems: 6 });
    const b = buildSession(emptyStates(), 0, makeRng(11), { targetItems: 6 });
    expect(a).toEqual(b);
  });
});
