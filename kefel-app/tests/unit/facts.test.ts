import { buildFactDeck, canonicalId, familyOf, factById, factDeck } from '@/features/engine/facts';

describe('fact deck', () => {
  const deck = buildFactDeck();

  it('contains exactly the 66 canonical facts (a <= b, 0..10)', () => {
    expect(deck).toHaveLength(66);
    expect(deck.every((c) => c.a <= c.b)).toBe(true);
  });

  it('keeps every product within 0..100', () => {
    expect(deck.every((c) => c.product >= 0 && c.product <= 100)).toBe(true);
    expect(deck.find((c) => c.id === '10x10')?.product).toBe(100);
  });

  it('collapses commutative pairs to one canonical id', () => {
    expect(canonicalId(3, 4)).toBe('3x4');
    expect(canonicalId(4, 3)).toBe('3x4');
  });

  it('assigns family by the operand introduced earliest (the strategy anchor)', () => {
    expect(familyOf(2, 5)).toBe('x2'); // 2×5 is learned during ×2 (doubling)
    expect(familyOf(2, 8)).toBe('x2');
    expect(familyOf(0, 7)).toBe('x0'); // trivially during ×0
    expect(familyOf(7, 8)).toBe('x7'); // both hard -> earlier of the two
  });

  it('orders x0/x1/x2 families before x7/x8', () => {
    const order = deck.map((c) => c.family);
    const firstX8 = order.indexOf('x8');
    const lastX2 = order.lastIndexOf('x2');
    expect(lastX2).toBeLessThan(firstX8);
  });

  it('always includes the array + equal_groups scaffolding strategies', () => {
    expect(deck.every((c) => c.strategies.includes('array'))).toBe(true);
    expect(deck.every((c) => c.strategies.includes('equal_groups'))).toBe(true);
  });

  it('memoizes and looks up by id', () => {
    expect(factDeck()).toBe(factDeck());
    expect(factById('7x8')?.product).toBe(56);
    expect(factById('nope')).toBeUndefined();
  });
});
