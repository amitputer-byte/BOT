/**
 * Parent gate.
 *
 * A child-resistant challenge guards the adult area — deliberately a 2-digit
 * arithmetic problem that a 7–8 y/o is unlikely to solve quickly, rather than a
 * stored PIN (no secret to leak, nothing to reset). Pure + seeded for tests.
 */
import { randInt, type Rng } from '@/lib/random';
import { expr } from '@/lib/rtl';

export interface GateChallenge {
  a: number;
  b: number;
  answer: number;
  /** Bidi-safe prompt fragment, e.g. "13 × 7". */
  prompt: string;
}

/** Two-digit × single-digit multiplication — beyond the child curriculum. */
export function makeGateChallenge(rng: Rng): GateChallenge {
  const a = randInt(rng, 11, 19);
  const b = randInt(rng, 3, 9);
  return { a, b, answer: a * b, prompt: expr(a, b) };
}

export function verifyGate(challenge: GateChallenge, input: number): boolean {
  return Number.isFinite(input) && input === challenge.answer;
}
