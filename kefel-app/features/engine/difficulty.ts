/**
 * Adaptive difficulty scoring and item shaping.
 *
 * `fragility` is a 0..1 score (higher = shakier) combining error rate, hint
 * dependence, latency, and lapse history. The session builder uses it to fill
 * the "fragile facts" slice and to rank what most needs review.
 */
import type { MasteryState } from '@/data/schemas';
import { clamp } from '@/lib/math';
import { randInt, shuffle, type Rng } from '@/lib/random';

const TARGET_LATENCY_MS = 4000; // a comfortable retrieval for this age
const SLOW_LATENCY_MS = 9000;

export function accuracy(s: MasteryState): number {
  return s.attempts === 0 ? 0 : s.correct / s.attempts;
}

export function hintDependence(s: MasteryState): number {
  return s.attempts === 0 ? 0 : s.hintCount / s.attempts;
}

/** 0..1 latency penalty (0 fast, 1 slow), saturating past SLOW_LATENCY_MS. */
function latencyPenalty(s: MasteryState): number {
  if (s.medianLatencyMs <= TARGET_LATENCY_MS) return 0;
  const span = SLOW_LATENCY_MS - TARGET_LATENCY_MS;
  return clamp((s.medianLatencyMs - TARGET_LATENCY_MS) / span, 0, 1);
}

/**
 * Composite fragility. Weighted so recent errors and at_risk status dominate,
 * with latency and hint reliance as secondary signals.
 */
export function fragility(s: MasteryState): number {
  if (s.attempts === 0) return 0.5; // unknown -> medium
  const errorRate = 1 - accuracy(s);
  const recentError = s.consecutiveErrors > 0 ? 0.25 : 0;
  const atRisk = s.status === 'at_risk' ? 0.3 : 0;
  const lapses = clamp(s.lapseCount * 0.1, 0, 0.3);
  const raw =
    0.4 * errorRate +
    0.15 * hintDependence(s) +
    0.15 * latencyPenalty(s) +
    recentError +
    atRisk +
    lapses;
  return clamp(raw, 0, 1);
}

export function isFragile(s: MasteryState): boolean {
  return s.status === 'at_risk' || (s.status === 'practicing' && fragility(s) >= 0.4);
}

/** A "strong" fact used as an easy win / confidence builder. */
export function isEasyWin(s: MasteryState): boolean {
  return (s.status === 'strong' || s.status === 'mastered') && s.consecutiveErrors === 0;
}

/** Randomly choose presentation orientation for a canonical fact. */
export function chooseOrientation(rng: Rng, a: number, b: number): [number, number] {
  return rng() < 0.5 ? [a, b] : [b, a];
}

/**
 * Plausible multiple-choice distractors near the product: off-by-one-row,
 * neighbour facts, and a digit-swap. Deduped, never equal to the answer.
 */
export function makeDistractors(
  rng: Rng,
  a: number,
  b: number,
  count = 3,
): number[] {
  const answer = a * b;
  const candidates = new Set<number>([
    a * b + a,
    a * b - a,
    a * b + b,
    a * b - b,
    (a + 1) * b,
    a * (b + 1),
    answer + 1,
    answer - 1,
  ]);
  candidates.delete(answer);
  const pool = [...candidates].filter((n) => n >= 0 && n <= 100);
  const chosen = shuffle(rng, pool).slice(0, count);
  // Backfill if the pool was too small (e.g. for ×0 facts).
  while (chosen.length < count) {
    const filler = clamp(answer + randInt(rng, -5, 5), 0, 100);
    if (filler !== answer && !chosen.includes(filler)) chosen.push(filler);
  }
  return chosen;
}
