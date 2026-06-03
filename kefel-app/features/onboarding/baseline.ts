/**
 * Baseline check.
 *
 * A short probe over the EASIEST families (×0, ×1, ×2, ×10) so the first real
 * session starts from a realistic picture instead of treating every fact as
 * brand new. Pure: maps probe answers to seed MasteryState records.
 */
import type { MasteryState } from '@/data/schemas';
import { initialMastery, gradeAttempt } from '@/features/engine/mastery';
import { factDeck } from '@/features/engine/facts';
import type { EpochMs } from '@/lib/time';

export interface BaselineProbe {
  factId: string;
  a: number;
  b: number;
}

/** Pick a handful of easy, representative facts for the probe. */
export function baselineProbes(): BaselineProbe[] {
  const easyFamilies = new Set(['x1', 'x2', 'x10']);
  return factDeck()
    .filter((c) => easyFamilies.has(c.family) && c.a > 0 && c.b > 1)
    .slice(0, 4)
    .map((c) => ({ factId: c.id, a: c.a, b: c.b }));
}

export interface BaselineResult {
  factId: string;
  correct: boolean;
  latencyMs: number;
}

/** Turn probe results into seed mastery states (independent, unscaffolded). */
export function seedFromBaseline(
  childId: string,
  results: BaselineResult[],
  now: EpochMs,
): MasteryState[] {
  return results.map((r) => {
    const seed = initialMastery(childId, r.factId);
    return gradeAttempt(
      seed,
      {
        correct: r.correct,
        usedHint: false,
        scaffolded: false,
        isTransferItem: false,
        latencyMs: r.latencyMs,
      },
      now,
    ).next;
  });
}
