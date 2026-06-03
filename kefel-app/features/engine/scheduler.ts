/**
 * Spaced-repetition scheduler.
 *
 * Pure functions over MasteryState. The interval ladder follows the product
 * spec: same-session quick revisit, then 1, 3, 7, 14, 30 days. Independent
 * retrieval advances the ladder; hinted/scaffolded success holds position;
 * a miss steps the ladder back and flags a lapse.
 */
import type { MasteryState } from '@/data/schemas';
import { DAY, MINUTE, type EpochMs } from '@/lib/time';
import { clamp } from '@/lib/math';

/** Days per interval index. Index 0 == same-session revisit. */
export const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30] as const;
export const MAX_INTERVAL_INDEX = INTERVALS_DAYS.length - 1; // 5
/** Reaching this index means the fact has survived ~a week of spacing. */
export const STRONG_INTERVAL_INDEX = 3; // 7 days
/** Same-session revisit delay so the fact reappears later in the session. */
export const SAME_SESSION_DELAY_MS = 8 * MINUTE;

export interface Grade {
  correct: boolean;
  /** Independent == correct with no hint and no visual scaffold. */
  independent: boolean;
}

/** Next interval index given the current one and the grade. */
export function nextIntervalIndex(current: number, grade: Grade): number {
  const cur = current < 0 ? 0 : current;
  if (!grade.correct) {
    // Lapse: drop two steps but never below floor.
    return clamp(cur - 2, 0, MAX_INTERVAL_INDEX);
  }
  if (!grade.independent) {
    // Hinted/scaffolded success holds position (does not earn advancement).
    return cur;
  }
  return clamp(cur + 1, 0, MAX_INTERVAL_INDEX);
}

/** Compute the next due timestamp from an interval index. */
export function dueFromInterval(now: EpochMs, intervalIndex: number): EpochMs {
  const idx = clamp(intervalIndex, 0, MAX_INTERVAL_INDEX);
  const days = INTERVALS_DAYS[idx]!;
  return days === 0 ? now + SAME_SESSION_DELAY_MS : now + days * DAY;
}

export function isDue(state: Pick<MasteryState, 'nextDueAt'>, now: EpochMs): boolean {
  return state.nextDueAt !== null && state.nextDueAt <= now;
}

/** How overdue a fact is, in days (negative if not yet due). Used for ranking. */
export function overdueDays(state: Pick<MasteryState, 'nextDueAt'>, now: EpochMs): number {
  if (state.nextDueAt === null) return 0;
  return (now - state.nextDueAt) / DAY;
}

/**
 * Apply a grade to the scheduling fields only (interval + due + lapse).
 * Status/KPI accumulation lives in mastery.ts; this stays single-purpose.
 */
export function applySchedule(
  state: MasteryState,
  grade: Grade,
  now: EpochMs,
): Pick<MasteryState, 'intervalIndex' | 'nextDueAt' | 'lastSeenAt' | 'lapseCount'> {
  const wasScheduled = state.intervalIndex >= 0;
  const lapsed = wasScheduled && !grade.correct;
  const idx = nextIntervalIndex(state.intervalIndex, grade);
  return {
    intervalIndex: idx,
    nextDueAt: dueFromInterval(now, idx),
    lastSeenAt: now,
    lapseCount: state.lapseCount + (lapsed ? 1 : 0),
  };
}
