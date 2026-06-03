/**
 * Pure reward + forgiving-streak logic. No side effects; the store persists the
 * returned values. Streak is weekly and self-healing (a single shield recovers
 * one missed day) so a child is never punished for a day off.
 */
import type { StreakState } from '@/data/schemas';
import { STAR_AWARDS } from '@/content/rewards';
import { dayKey, calendarDaysBetween, type EpochMs } from '@/lib/time';

export function starsForAnswer(correct: boolean, usedHint: boolean): number {
  if (!correct) return 0;
  return usedHint ? STAR_AWARDS.correctWithHint : STAR_AWARDS.correctIndependent;
}

/** ISO week key (year-Www) for weekly streak bucketing. */
export function weekKeyOf(now: EpochMs): string {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export interface StreakUpdate {
  next: StreakState;
  shieldUsed: boolean;
  incremented: boolean;
}

/**
 * Update streak when the child completes activity on `now`.
 * - New week resets the weekly count (but keeps the longest record).
 * - Same day twice does not double-count.
 * - A gap of exactly one missed day consumes the shield (if available) instead
 *   of breaking the streak.
 */
export function updateStreak(prev: StreakState, now: EpochMs): StreakUpdate {
  const todayKey = dayKey(now);
  const wk = weekKeyOf(now);

  if (prev.lastActiveDayKey === todayKey) {
    return { next: prev, shieldUsed: false, incremented: false };
  }

  const newWeek = prev.weekKey !== wk;
  let weeklyCount = newWeek ? 0 : prev.weeklyCount;
  let shieldAvailable = newWeek ? true : prev.shieldAvailable;
  let shieldUsed = false;

  if (!newWeek && prev.lastActiveDayKey) {
    // Re-derive the gap in calendar days from the last active midnight.
    const lastMs = Date.parse(prev.lastActiveDayKey);
    const gap = calendarDaysBetween(lastMs, Date.parse(todayKey));
    if (gap >= 2 && shieldAvailable) {
      shieldAvailable = false; // shield absorbs the missed day(s)
      shieldUsed = true;
    }
  }

  weeklyCount += 1;
  const longest = Math.max(prev.longestWeeklyCount, weeklyCount);

  return {
    next: {
      ...prev,
      weeklyCount,
      weekKey: wk,
      shieldAvailable,
      lastActiveDayKey: todayKey,
      longestWeeklyCount: longest,
    },
    shieldUsed,
    incremented: true,
  };
}
