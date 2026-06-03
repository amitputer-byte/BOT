/**
 * Time helpers. Engine functions take an explicit `now` epoch-ms so they stay
 * pure and testable; nothing in the engine reads the wall clock directly.
 */
export type EpochMs = number;

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function daysToMs(days: number): number {
  return days * DAY;
}

export function msToDays(ms: number): number {
  return ms / DAY;
}

/** Local calendar day key (YYYY-MM-DD) for streak / daily-goal bucketing. */
export function dayKey(now: EpochMs, tzOffsetMinutes = new Date(now).getTimezoneOffset()): string {
  const local = new Date(now - tzOffsetMinutes * MINUTE);
  return local.toISOString().slice(0, 10);
}

/** Whole calendar days between two instants (b - a), floored. */
export function calendarDaysBetween(a: EpochMs, b: EpochMs): number {
  return Math.floor((b - a) / DAY);
}
