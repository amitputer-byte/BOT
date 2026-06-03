import { starsForAnswer, updateStreak, weekKeyOf } from '@/features/rewards/rewards';
import type { StreakState } from '@/data/schemas';
import { DAY } from '@/lib/time';

const base: StreakState = {
  childId: 'c',
  weeklyCount: 0,
  weekKey: '',
  shieldAvailable: true,
  lastActiveDayKey: null,
  longestWeeklyCount: 0,
};

describe('reward + streak logic', () => {
  it('awards more stars for independent answers', () => {
    expect(starsForAnswer(true, false)).toBe(2);
    expect(starsForAnswer(true, true)).toBe(1);
    expect(starsForAnswer(false, false)).toBe(0);
  });

  it('increments the streak once per day', () => {
    const t = Date.parse('2026-06-01T09:00:00Z');
    const first = updateStreak(base, t);
    expect(first.incremented).toBe(true);
    expect(first.next.weeklyCount).toBe(1);

    const sameDay = updateStreak(first.next, t + 3 * 60 * 60 * 1000);
    expect(sameDay.incremented).toBe(false);
    expect(sameDay.next.weeklyCount).toBe(1);
  });

  it('counts consecutive days within a week', () => {
    const t = Date.parse('2026-06-01T09:00:00Z'); // Monday
    let s = updateStreak(base, t).next;
    s = updateStreak(s, t + DAY).next;
    expect(s.weeklyCount).toBe(2);
  });

  it('uses the shield to forgive a single missed day', () => {
    const mon = Date.parse('2026-06-01T09:00:00Z');
    let s = updateStreak(base, mon).next;
    expect(s.shieldAvailable).toBe(true);
    // Skip Tuesday, return Wednesday -> shield absorbs the gap.
    const wed = updateStreak(s, mon + 2 * DAY);
    expect(wed.shieldUsed).toBe(true);
    expect(wed.next.shieldAvailable).toBe(false);
    expect(wed.next.weeklyCount).toBe(2);
  });

  it('resets weekly count on a new week but keeps the record', () => {
    const wk1 = Date.parse('2026-06-01T09:00:00Z');
    let s = updateStreak(base, wk1).next;
    s = updateStreak(s, wk1 + DAY).next; // weeklyCount 2
    const nextWeek = updateStreak(s, wk1 + 8 * DAY);
    expect(nextWeek.next.weeklyCount).toBe(1);
    expect(nextWeek.next.longestWeeklyCount).toBe(2);
  });

  it('derives stable ISO week keys', () => {
    expect(weekKeyOf(Date.parse('2026-06-01T00:00:00Z'))).toMatch(/^2026-W\d\d$/);
  });
});
