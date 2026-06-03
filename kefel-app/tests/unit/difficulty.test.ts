import {
  fragility,
  isFragile,
  isEasyWin,
  makeDistractors,
  accuracy,
  hintDependence,
} from '@/features/engine/difficulty';
import { initialMastery } from '@/features/engine/mastery';
import { makeRng } from '@/lib/random';
import type { MasteryState } from '@/data/schemas';

function st(partial: Partial<MasteryState>): MasteryState {
  return { ...initialMastery('c', '7x8'), ...partial };
}

describe('difficulty scoring', () => {
  it('computes accuracy and hint dependence', () => {
    const s = st({ attempts: 10, correct: 6, hintCount: 4 });
    expect(accuracy(s)).toBeCloseTo(0.6);
    expect(hintDependence(s)).toBeCloseTo(0.4);
  });

  it('rates an at_risk fact with recent errors as highly fragile', () => {
    const shaky = st({ status: 'at_risk', attempts: 6, correct: 2, consecutiveErrors: 2 });
    const solid = st({ status: 'strong', attempts: 10, correct: 10 });
    expect(fragility(shaky)).toBeGreaterThan(fragility(solid));
    expect(fragility(shaky)).toBeGreaterThan(0.5);
  });

  it('flags fragile and easy-win facts correctly', () => {
    expect(isFragile(st({ status: 'at_risk', attempts: 3, correct: 1 }))).toBe(true);
    expect(isEasyWin(st({ status: 'strong', consecutiveErrors: 0 }))).toBe(true);
    expect(isEasyWin(st({ status: 'strong', consecutiveErrors: 1 }))).toBe(false);
  });

  it('generates valid, deduped distractors that exclude the answer', () => {
    const rng = makeRng(42);
    const d = makeDistractors(rng, 7, 8, 3);
    expect(d).toHaveLength(3);
    expect(new Set(d).size).toBe(3);
    expect(d.includes(56)).toBe(false);
    expect(d.every((n) => n >= 0 && n <= 100)).toBe(true);
  });

  it('still produces distractors for degenerate ×0 facts', () => {
    const rng = makeRng(1);
    const d = makeDistractors(rng, 0, 6, 3);
    expect(d).toHaveLength(3);
    expect(d.includes(0)).toBe(false);
  });

  it('is deterministic for a fixed seed', () => {
    expect(makeDistractors(makeRng(99), 6, 7)).toEqual(makeDistractors(makeRng(99), 6, 7));
  });
});
