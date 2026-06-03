/**
 * Pure answer-processing pipeline used by the lesson/review store action.
 *
 * Keeping this pure (no persistence, no RN) means the most behaviour-critical
 * path — what happens when a child answers — is fully unit-testable.
 */
import type { AttemptRecord, MasteryState } from '@/data/schemas';
import type { SessionItem } from '@/features/engine/sessionBuilder';
import { gradeAttempt, initialMastery, type GradeResult } from '@/features/engine/mastery';
import { starsForAnswer } from '@/features/rewards/rewards';
import { canonicalId } from '@/features/engine/facts';
import type { EpochMs } from '@/lib/time';

export interface AnswerInput {
  correct: boolean;
  usedHint: boolean;
  scaffolded: boolean;
  latencyMs: number;
  rawValue: number; // what the child entered/selected
}

export interface ProcessContext {
  childId: string;
  sessionId: string;
  now: EpochMs;
  newAttemptId: string;
}

export interface ProcessResult {
  nextMastery: MasteryState;
  attempt: AttemptRecord;
  starsEarned: number;
  grade: GradeResult;
}

export function processAnswer(
  prevMastery: MasteryState | undefined,
  item: SessionItem,
  input: AnswerInput,
  ctx: ProcessContext,
): ProcessResult {
  const factId = canonicalId(item.a, item.b);
  const prev = prevMastery ?? initialMastery(ctx.childId, factId);
  const isTransfer = item.kind === 'transfer';

  const grade = gradeAttempt(
    prev,
    {
      correct: input.correct,
      usedHint: input.usedHint,
      scaffolded: input.scaffolded,
      isTransferItem: isTransfer,
      latencyMs: input.latencyMs,
    },
    ctx.now,
  );

  const attempt: AttemptRecord = {
    id: ctx.newAttemptId,
    childId: ctx.childId,
    factId,
    shownA: item.a,
    shownB: item.b,
    outcome: input.correct ? 'correct' : 'incorrect',
    usedHint: input.usedHint,
    scaffolded: input.scaffolded,
    isTransferItem: isTransfer,
    latencyMs: input.latencyMs,
    sessionId: ctx.sessionId,
    activity: item.kind === 'transfer' ? 'transfer' : item.source,
    at: ctx.now,
  };

  return {
    nextMastery: grade.next,
    attempt,
    starsEarned: starsForAnswer(input.correct, input.usedHint),
    grade,
  };
}
