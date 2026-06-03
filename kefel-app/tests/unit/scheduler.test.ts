import {
  nextIntervalIndex,
  dueFromInterval,
  isDue,
  applySchedule,
  INTERVALS_DAYS,
  MAX_INTERVAL_INDEX,
  SAME_SESSION_DELAY_MS,
} from '@/features/engine/scheduler';
import { initialMastery } from '@/features/engine/mastery';
import { DAY } from '@/lib/time';

describe('scheduler intervals', () => {
  it('advances one step on independent correct', () => {
    expect(nextIntervalIndex(0, { correct: true, independent: true })).toBe(1);
    expect(nextIntervalIndex(2, { correct: true, independent: true })).toBe(3);
  });

  it('caps at the maximum interval index', () => {
    expect(nextIntervalIndex(MAX_INTERVAL_INDEX, { correct: true, independent: true })).toBe(
      MAX_INTERVAL_INDEX,
    );
  });

  it('holds position on hinted/scaffolded success', () => {
    expect(nextIntervalIndex(3, { correct: true, independent: false })).toBe(3);
  });

  it('steps back two on a miss but never below zero', () => {
    expect(nextIntervalIndex(4, { correct: false, independent: false })).toBe(2);
    expect(nextIntervalIndex(1, { correct: false, independent: false })).toBe(0);
  });

  it('maps interval index 0 to a same-session revisit', () => {
    const now = 1_000_000;
    expect(dueFromInterval(now, 0)).toBe(now + SAME_SESSION_DELAY_MS);
  });

  it('maps later indices to the day ladder', () => {
    const now = 1_000_000;
    expect(dueFromInterval(now, 3)).toBe(now + INTERVALS_DAYS[3] * DAY);
  });

  it('detects due facts', () => {
    expect(isDue({ nextDueAt: 100 }, 200)).toBe(true);
    expect(isDue({ nextDueAt: 300 }, 200)).toBe(false);
    expect(isDue({ nextDueAt: null }, 200)).toBe(false);
  });

  it('records a lapse only when a scheduled fact is missed', () => {
    const fresh = { ...initialMastery('c', '3x4'), intervalIndex: 3 };
    const out = applySchedule(fresh, { correct: false, independent: false }, 5000);
    expect(out.lapseCount).toBe(1);
    expect(out.intervalIndex).toBe(1);

    const unscheduled = applySchedule(
      initialMastery('c', '3x4'),
      { correct: false, independent: false },
      5000,
    );
    expect(unscheduled.lapseCount).toBe(0);
  });
});
