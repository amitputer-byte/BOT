/**
 * Parent report aggregation — pure and testable.
 *
 * Turns raw mastery/attempt/session data into a ParentReportSnapshot with the
 * product KPIs: mixed-review accuracy, 7/30-day retention, transfer accuracy,
 * hint dependence, session completion, streak participation, frustration-quit.
 */
import type {
  MasteryState,
  AttemptRecord,
  SessionSummary,
  StreakState,
  ParentReportSnapshot,
} from '@/data/schemas';
import { factDeck } from '@/features/engine/facts';
import { isDue } from '@/features/engine/scheduler';
import { isFragile } from '@/features/engine/difficulty';
import { DAY, type EpochMs } from '@/lib/time';
import { recommendNextAction } from '@/content/he/parentSummary';

export interface ReportInputs {
  childId: string;
  states: MasteryState[];
  attempts: AttemptRecord[];
  sessions: SessionSummary[];
  streak: StreakState | null;
  now: EpochMs;
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

/** Accuracy on attempts after `sinceDaysAgo`, optionally only retrieval items. */
function accuracyWindow(
  attempts: AttemptRecord[],
  now: EpochMs,
  sinceDays: number,
  filter: (a: AttemptRecord) => boolean = () => true,
): number {
  const cutoff = now - sinceDays * DAY;
  const inWindow = attempts.filter((a) => a.at >= cutoff && filter(a));
  const correct = inWindow.filter((a) => a.outcome === 'correct').length;
  return ratio(correct, inWindow.length);
}

export function buildReport(input: ReportInputs): ParentReportSnapshot {
  const { states, attempts, sessions, streak, now, childId } = input;
  const byId = new Map(states.map((s) => [s.factId, s]));

  const mastered = states.filter((s) => s.status === 'mastered').length;
  const strong = states.filter((s) => s.status === 'strong').length;
  const fragile = states.filter((s) => isFragile(s)).length;
  const dueToday = states.filter((s) => isDue(s, now)).length;

  const totalAttempts = attempts.length;
  const hinted = attempts.filter((a) => a.usedHint).length;
  const transferAttempts = attempts.filter((a) => a.isTransferItem);
  const transferCorrect = transferAttempts.filter((a) => a.outcome === 'correct').length;

  const completedSessions = sessions.filter((s) => s.completed).length;
  const quitSessions = sessions.filter((s) => s.quitEarly).length;

  // Streak participation: active days this week / 7.
  const streakParticipation = streak ? ratio(streak.weeklyCount, 7) : 0;

  // Heatmap over the full canonical deck (status per a×b cell).
  const heatmap = factDeck().map((c) => ({
    a: c.a,
    b: c.b,
    status: byId.get(c.id)?.status ?? ('new' as const),
  }));

  const snapshot: ParentReportSnapshot = {
    childId,
    generatedAt: now,
    totalFacts: factDeck().length,
    masteredFacts: mastered,
    strongFacts: strong,
    fragileFacts: fragile,
    dueToday,
    mixedReviewAccuracy: accuracyWindow(attempts, now, 30, (a) => !a.isTransferItem),
    retention7d: accuracyWindow(attempts, now, 7),
    retention30d: accuracyWindow(attempts, now, 30),
    transferAccuracy: ratio(transferCorrect, transferAttempts.length),
    hintDependence: ratio(hinted, totalAttempts),
    sessionCompletionRate: ratio(completedSessions, sessions.length),
    streakParticipation,
    frustrationQuitRate: ratio(quitSessions, sessions.length),
    totalTimeMs: sessions.reduce((sum, s) => sum + ((s.endedAt ?? s.startedAt) - s.startedAt), 0),
    recommendedNextAction: '',
    heatmap,
  };

  snapshot.recommendedNextAction = recommendNextAction(snapshot);
  return snapshot;
}

/** Exportable, parent-readable summary (data structure, not a file). */
export function toExport(snapshot: ParentReportSnapshot) {
  return {
    generatedAt: new Date(snapshot.generatedAt).toISOString(),
    facts: {
      total: snapshot.totalFacts,
      mastered: snapshot.masteredFacts,
      strong: snapshot.strongFacts,
      fragile: snapshot.fragileFacts,
      dueToday: snapshot.dueToday,
    },
    kpis: {
      mixedReviewAccuracy: snapshot.mixedReviewAccuracy,
      retention7d: snapshot.retention7d,
      retention30d: snapshot.retention30d,
      transferAccuracy: snapshot.transferAccuracy,
      hintDependence: snapshot.hintDependence,
      sessionCompletionRate: snapshot.sessionCompletionRate,
      streakParticipation: snapshot.streakParticipation,
      frustrationQuitRate: snapshot.frustrationQuitRate,
    },
    totalLearningMinutes: Math.round(snapshot.totalTimeMs / 60000),
  };
}
