/**
 * Pure game-content logic (no React). Each generator maps to an explicit
 * learning outcome and is deterministic under a seed for testing.
 */
import type { MasteryState } from '@/data/schemas';
import { factDeck } from '@/features/engine/facts';
import { fragility } from '@/features/engine/difficulty';
import { makeDistractors } from '@/features/engine/difficulty';
import { shuffle, pick, type Rng } from '@/lib/random';

export interface GameFact {
  a: number;
  b: number;
  product: number;
  factId: string;
}

/** Choose a fact worth practising: prefer fragile/introduced over brand-new. */
export function pickPracticeFact(states: Map<string, MasteryState>, rng: Rng): GameFact {
  const introduced = factDeck().filter((c) => {
    const s = states.get(c.id);
    return s && s.status !== 'new';
  });
  const pool = introduced.length
    ? introduced.sort((x, y) => fragility(states.get(y.id)!) - fragility(states.get(x.id)!)).slice(0, 8)
    : factDeck().slice(0, 8); // cold start: easiest facts
  const card = pick(rng, pool);
  return { a: card.a, b: card.b, product: card.product, factId: card.id };
}

/* --- Garden Arrays: build the array for a fact (concept: array/area) --- */
export interface ArrayTarget {
  rows: number;
  cols: number;
  product: number;
}
export function arrayTarget(fact: GameFact): ArrayTarget {
  return { rows: fact.a || 1, cols: fact.b || 1, product: fact.product };
}
export function isArrayCorrect(target: ArrayTarget, rows: number, cols: number): boolean {
  return rows * cols === target.product && target.product > 0;
}

/* --- Balloon Pop: tap balloons matching the answer (concept: fluency) --- */
export interface Balloon {
  id: number;
  value: number;
  isMatch: boolean;
}
export function buildBalloons(rng: Rng, fact: GameFact, count = 8): Balloon[] {
  const answer = fact.product;
  const matches = Math.max(2, Math.floor(count / 3));
  const distractors = makeDistractors(rng, fact.a, fact.b, count - matches);
  const values = [...Array(matches).fill(answer), ...distractors];
  return shuffle(rng, values).map((value, id) => ({ id, value, isMatch: value === answer }));
}

/* --- Multiplication Train: match expression cards to result cars --- */
export interface TrainPair {
  factId: string;
  expr: string;
  result: number;
}
export function buildTrainPairs(states: Map<string, MasteryState>, rng: Rng, n = 4): TrainPair[] {
  const picks: GameFact[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n * 3 && picks.length < n; i++) {
    const f = pickPracticeFact(states, rng);
    if (!used.has(f.factId) && f.product > 0) {
      used.add(f.factId);
      picks.push(f);
    }
  }
  return picks.map((f) => ({ factId: f.factId, expr: `${f.a} × ${f.b}`, result: f.product }));
}

/* --- Magic Lab: pick the correct decomposition (concept: strategy) --- */
export interface LabChallenge {
  fact: GameFact;
  options: { text: string; correct: boolean }[];
}
export function buildLabChallenge(rng: Rng, fact: GameFact): LabChallenge {
  const { a, b } = fact;
  const split = Math.max(1, Math.min(a, b) - 1);
  const big = Math.max(a, b);
  const correct = `${split} × ${big} + ${big} = ${split * big} + ${big}`;
  const wrong1 = `${split} × ${big} + ${split} = ${split * big} + ${split}`;
  const wrong2 = `${a} + ${b} = ${a + b}`;
  return {
    fact,
    options: shuffle(rng, [
      { text: correct, correct: true },
      { text: wrong1, correct: false },
      { text: wrong2, correct: false },
    ]),
  };
}
