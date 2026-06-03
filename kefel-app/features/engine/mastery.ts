/**
 * Mastery state machine + KPI accumulation.
 *
 * `gradeAttempt` is the single entry point the store calls per answer. It is
 * pure: (previous state, attempt facts, now) -> (next state, derived events).
 * It folds in scheduling (scheduler.ts) so status and interval stay consistent.
 *
 * Promotion rules (per spec):
 *  - success WITH a hint or scaffold never counts as independent mastery.
 *  - independent retrieval must accrue across spaced sessions (interval ladder).
 *  - a fact cannot reach `mastered` without passing a transfer item.
 *  - a miss on a scheduled fact moves it back to at_risk/practicing + reschedules.
 *  - after 2 consecutive errors, the engine asks the UI to step down to a scaffold.
 */
import type { MasteryState, MasteryStatus } from '@/data/schemas';
import type { EpochMs } from '@/lib/time';
import { median } from '@/lib/math';
import { applySchedule, STRONG_INTERVAL_INDEX, MAX_INTERVAL_INDEX, type Grade } from './scheduler';

export interface AttemptInput {
  correct: boolean;
  usedHint: boolean;
  scaffolded: boolean;
  isTransferItem: boolean;
  latencyMs: number;
}

export interface GradeResult {
  next: MasteryState;
  events: {
    mastered: boolean; // crossed into `mastered` on this attempt
    lapsed: boolean; // dropped out of strong/mastered on this attempt
    promoted: boolean; // status improved at all
    shouldScaffoldNext: boolean; // 2+ consecutive errors -> step down
  };
}

const ERRORS_BEFORE_SCAFFOLD = 2;
const RECENT_LATENCY_WINDOW = 10;

/** Create a blank state for a fact the child has never seen. */
export function initialMastery(childId: string, factId: string): MasteryState {
  return {
    childId,
    factId,
    status: 'new',
    attempts: 0,
    correct: 0,
    independentCorrect: 0,
    hintCount: 0,
    medianLatencyMs: 0,
    transferSuccess: 0,
    lapseCount: 0,
    consecutiveIndependent: 0,
    consecutiveErrors: 0,
    intervalIndex: -1,
    lastSeenAt: null,
    nextDueAt: null,
    recentLatenciesMs: [],
  };
}

/** Decide the next status given updated counters (pure, ordered hierarchy). */
function deriveStatus(s: MasteryState, wasScheduled: boolean, correct: boolean): MasteryStatus {
  // A miss on a previously-scheduled fact demotes it.
  if (!correct && wasScheduled) {
    // Strong/mastered facts fall to at_risk; everything else keeps practicing.
    return s.intervalIndex <= 1 ? 'practicing' : 'at_risk';
  }

  const hasTransfer = s.transferSuccess >= 1;
  const reachedTop = s.intervalIndex >= MAX_INTERVAL_INDEX;
  const reachedStrong = s.intervalIndex >= STRONG_INTERVAL_INDEX;

  if (reachedTop && hasTransfer && s.independentCorrect >= 3) return 'mastered';
  if (reachedStrong && s.independentCorrect >= 2) return 'strong';
  if (s.independentCorrect >= 1) return 'practicing';
  if (s.attempts >= 1) return 'learning';
  return 'new';
}

const RANK: Record<MasteryStatus, number> = {
  new: 0,
  learning: 1,
  at_risk: 1, // sideways, not an improvement
  practicing: 2,
  strong: 3,
  mastered: 4,
};

export function gradeAttempt(
  prev: MasteryState,
  attempt: AttemptInput,
  now: EpochMs,
): GradeResult {
  const independent = attempt.correct && !attempt.usedHint && !attempt.scaffolded;
  const grade: Grade = { correct: attempt.correct, independent };
  const wasScheduled = prev.intervalIndex >= 0;
  const wasStrongOrBetter = prev.status === 'strong' || prev.status === 'mastered';

  // Rolling latency window -> median KPI.
  const recent = [...prev.recentLatenciesMs, attempt.latencyMs].slice(-RECENT_LATENCY_WINDOW);

  const counters: MasteryState = {
    ...prev,
    attempts: prev.attempts + 1,
    correct: prev.correct + (attempt.correct ? 1 : 0),
    independentCorrect: prev.independentCorrect + (independent ? 1 : 0),
    hintCount: prev.hintCount + (attempt.usedHint ? 1 : 0),
    transferSuccess:
      prev.transferSuccess + (attempt.isTransferItem && attempt.correct ? 1 : 0),
    consecutiveIndependent: independent ? prev.consecutiveIndependent + 1 : 0,
    consecutiveErrors: attempt.correct ? 0 : prev.consecutiveErrors + 1,
    recentLatenciesMs: recent,
    medianLatencyMs: median(recent),
  };

  const sched = applySchedule(counters, grade, now);
  const withSchedule: MasteryState = { ...counters, ...sched };
  const status = deriveStatus(withSchedule, wasScheduled, attempt.correct);
  const next: MasteryState = { ...withSchedule, status };

  const lapsed = wasStrongOrBetter && (status === 'at_risk' || status === 'practicing');
  const mastered = prev.status !== 'mastered' && status === 'mastered';
  const promoted = RANK[status] > RANK[prev.status];
  const shouldScaffoldNext = next.consecutiveErrors >= ERRORS_BEFORE_SCAFFOLD;

  return { next, events: { mastered, lapsed, promoted, shouldScaffoldNext } };
}
