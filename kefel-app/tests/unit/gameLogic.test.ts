import {
  pickPracticeFact,
  arrayTarget,
  isArrayCorrect,
  buildBalloons,
  buildTrainPairs,
  buildLabChallenge,
} from '@/features/games/gameLogic';
import { initialMastery } from '@/features/engine/mastery';
import type { MasteryState } from '@/data/schemas';
import { makeRng } from '@/lib/random';

function states(entries: Array<[string, Partial<MasteryState>]>): Map<string, MasteryState> {
  const m = new Map<string, MasteryState>();
  for (const [id, p] of entries) m.set(id, { ...initialMastery('c', id), ...p });
  return m;
}

describe('game logic', () => {
  it('picks an introduced fact when available', () => {
    const s = states([['3x4', { status: 'practicing', attempts: 4, correct: 2 }]]);
    const f = pickPracticeFact(s, makeRng(1));
    expect(f.product).toBe(f.a * f.b);
  });

  it('falls back to easy facts at cold start', () => {
    const f = pickPracticeFact(new Map(), makeRng(1));
    expect(f.factId).toMatch(/^\d+x\d+$/);
  });

  it('validates array builds', () => {
    const target = arrayTarget({ a: 3, b: 4, product: 12, factId: '3x4' });
    expect(isArrayCorrect(target, 3, 4)).toBe(true);
    expect(isArrayCorrect(target, 2, 6)).toBe(true); // any rows*cols == product
    expect(isArrayCorrect(target, 3, 5)).toBe(false);
  });

  it('builds balloons with at least two correct matches', () => {
    const b = buildBalloons(makeRng(5), { a: 6, b: 7, product: 42, factId: '6x7' }, 8);
    expect(b).toHaveLength(8);
    expect(b.filter((x) => x.isMatch).length).toBeGreaterThanOrEqual(2);
    expect(b.filter((x) => x.isMatch).every((x) => x.value === 42)).toBe(true);
  });

  it('builds unique train pairs', () => {
    const s = states([
      ['2x3', { status: 'practicing' }],
      ['4x5', { status: 'practicing' }],
      ['6x7', { status: 'strong' }],
    ]);
    const pairs = buildTrainPairs(s, makeRng(2), 3);
    const ids = pairs.map((p) => p.factId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pairs.every((p) => p.result > 0)).toBe(true);
  });

  it('builds a lab challenge with exactly one correct decomposition', () => {
    const c = buildLabChallenge(makeRng(3), { a: 7, b: 8, product: 56, factId: '7x8' });
    expect(c.options.filter((o) => o.correct)).toHaveLength(1);
  });
});
