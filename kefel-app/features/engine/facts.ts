/**
 * The fact space and its static teaching metadata.
 *
 * We track mastery on CANONICAL facts only (a <= b), collapsing commutative
 * pairs, while the UI may present either orientation. All products of
 * 0..10 × 0..10 are <= 100, so the canonical space is the full 0–10 table
 * folded along the diagonal (66 facts).
 */
import type { FactCard, FactFamily, StrategyKey } from '@/data/schemas';

export const MIN_OPERAND = 0;
export const MAX_OPERAND = 10;

/**
 * Family rank == order in which the defining operand's strategy is taught.
 * A fact's family is the operand introduced LATEST, because the fact can only
 * be learned once the harder factor's strategy is available.
 */
const FAMILY_RANK: Record<number, { rank: number; family: FactFamily }> = {
  0: { rank: 0, family: 'x0' },
  1: { rank: 1, family: 'x1' },
  2: { rank: 2, family: 'x2' },
  10: { rank: 3, family: 'x10' },
  5: { rank: 4, family: 'x5' },
  4: { rank: 5, family: 'x4' },
  3: { rank: 6, family: 'x3' },
  6: { rank: 7, family: 'x6' },
  9: { rank: 8, family: 'x9' },
  7: { rank: 9, family: 'x7' },
  8: { rank: 10, family: 'x8' },
};

function definingOperand(a: number, b: number): number {
  return FAMILY_RANK[a]!.rank >= FAMILY_RANK[b]!.rank ? a : b;
}

const FAMILY_STRATEGIES: Record<FactFamily, StrategyKey[]> = {
  x0: ['identity_zero'],
  x1: ['identity_one'],
  x2: ['doubling', 'repeated_addition'],
  x10: ['place_value_ten'],
  x5: ['fives', 'repeated_addition'],
  x4: ['double_double'],
  x3: ['decompose_known', 'repeated_addition'],
  x6: ['five_plus_n', 'decompose_known'],
  x9: ['ten_minus_n'],
  x7: ['decompose_known'],
  x8: ['double_double', 'decompose_known'],
};

export function canonicalId(a: number, b: number): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${lo}x${hi}`;
}

export function familyOf(a: number, b: number): FactFamily {
  return FAMILY_RANK[definingOperand(a, b)]!.family;
}

export function strategiesFor(a: number, b: number): StrategyKey[] {
  const fam = familyOf(a, b);
  // Every fact also carries the two universal conceptual strategies used by
  // the visual scaffold (equal groups + array) ahead of the family strategy.
  const base: StrategyKey[] = ['equal_groups', 'array'];
  const famStrats = FAMILY_STRATEGIES[fam];
  // Commutative collapse is itself a teachable idea for off-diagonal facts.
  const commutative: StrategyKey[] = a !== b ? ['commutative'] : [];
  return Array.from(new Set([...base, ...famStrats, ...commutative]));
}

/** Build the full canonical fact deck, ordered by introduction order. */
export function buildFactDeck(): FactCard[] {
  const cards: FactCard[] = [];
  for (let a = MIN_OPERAND; a <= MAX_OPERAND; a++) {
    for (let b = a; b <= MAX_OPERAND; b++) {
      const product = a * b;
      if (product > 100) continue; // defensive; never true for 0..10
      const def = definingOperand(a, b);
      const other = def === a ? b : a;
      // Intro order: family rank dominates, then the easier co-factor first.
      const introOrder = FAMILY_RANK[def]!.rank * 100 + FAMILY_RANK[other]!.rank;
      cards.push({
        id: `${a}x${b}`,
        a,
        b,
        product,
        canonicalId: `${a}x${b}`,
        isCanonical: true,
        family: FAMILY_RANK[def]!.family,
        strategies: strategiesFor(a, b),
        introOrder,
      });
    }
  }
  cards.sort((x, y) => x.introOrder - y.introOrder);
  return cards;
}

let _deck: FactCard[] | null = null;
let _byId: Map<string, FactCard> | null = null;

export function factDeck(): FactCard[] {
  if (!_deck) _deck = buildFactDeck();
  return _deck;
}

export function factById(id: string): FactCard | undefined {
  if (!_byId) _byId = new Map(factDeck().map((c) => [c.id, c]));
  return _byId.get(id);
}

/** Families in canonical teaching order. */
export const FAMILY_ORDER: FactFamily[] = [
  'x0',
  'x1',
  'x2',
  'x10',
  'x5',
  'x4',
  'x3',
  'x6',
  'x9',
  'x7',
  'x8',
];
