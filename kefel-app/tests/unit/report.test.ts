import { buildReport, toExport } from '@/features/parent/report';
import type { AttemptRecord, SessionSummary, StreakState } from '@/data/schemas';
import { initialMastery, gradeAttempt } from '@/features/engine/mastery';
import { DAY } from '@/lib/time';

function attempt(p: Partial<AttemptRecord>): AttemptRecord {
  return {
    id: 'a', childId: 'c', factId: '3x4', shownA: 3, shownB: 4, outcome: 'correct',
    usedHint: false, scaffolded: false, isTransferItem: false, latencyMs: 2000,
    sessionId: 's', activity: 'review', at: 0, ...p,
  };
}

describe('parent report', () => {
  const now = 100 * DAY;

  it('computes hint dependence and transfer accuracy', () => {
    const attempts: AttemptRecord[] = [
      attempt({ at: now, usedHint: true }),
      attempt({ at: now, usedHint: false }),
      attempt({ at: now, isTransferItem: true, outcome: 'correct' }),
      attempt({ at: now, isTransferItem: true, outcome: 'incorrect' }),
    ];
    const r = buildReport({ childId: 'c', states: [], attempts, sessions: [], streak: null, now });
    expect(r.hintDependence).toBeCloseTo(0.25);
    expect(r.transferAccuracy).toBeCloseTo(0.5);
  });

  it('includes a full-deck heatmap with default new status', () => {
    const r = buildReport({ childId: 'c', states: [], attempts: [], sessions: [], streak: null, now });
    expect(r.heatmap).toHaveLength(66);
    expect(r.heatmap.every((cell) => cell.status === 'new')).toBe(true);
  });

  it('counts mastered facts and session completion', () => {
    const mastered = { ...initialMastery('c', '2x2'), status: 'mastered' as const };
    const sessions: SessionSummary[] = [
      { id: 's1', childId: 'c', startedAt: now - DAY, endedAt: now - DAY + 300000, activities: ['lesson'], itemsPlanned: 8, itemsAnswered: 8, correct: 7, hintsUsed: 1, starsEarned: 20, completed: true, quitEarly: false, factsMastered: [] },
      { id: 's2', childId: 'c', startedAt: now, endedAt: now, activities: ['lesson'], itemsPlanned: 8, itemsAnswered: 2, correct: 1, hintsUsed: 0, starsEarned: 2, completed: false, quitEarly: true, factsMastered: [] },
    ];
    const r = buildReport({ childId: 'c', states: [mastered], attempts: [], sessions, streak: null, now });
    expect(r.masteredFacts).toBe(1);
    expect(r.sessionCompletionRate).toBeCloseTo(0.5);
    expect(r.frustrationQuitRate).toBeCloseTo(0.5);
    expect(r.recommendedNextAction.length).toBeGreaterThan(0);
  });

  it('reflects streak participation out of 7 days', () => {
    const streak: StreakState = { childId: 'c', weeklyCount: 3, weekKey: '2026-W23', shieldAvailable: true, lastActiveDayKey: '2026-06-03', longestWeeklyCount: 5 };
    const r = buildReport({ childId: 'c', states: [], attempts: [], sessions: [], streak, now });
    expect(r.streakParticipation).toBeCloseTo(3 / 7);
  });

  it('produces a clean exportable structure', () => {
    const r = buildReport({ childId: 'c', states: [], attempts: [], sessions: [], streak: null, now });
    const exp = toExport(r);
    expect(exp.facts.total).toBe(66);
    expect(typeof exp.generatedAt).toBe('string');
  });
});
