/**
 * "Today" for this business means today in India, whatever timezone the server
 * runs in (Vercel and most hosts run in UTC). Every day, week and month
 * boundary in the admin panel comes from here.
 */

const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+05:30, no daylight saving
const DAY_MS = 86400000;

/** The Indian calendar date an instant falls on. Month is 0-based, like Date. */
export function istParts(at: Date = new Date()): { y: number; m: number; d: number } {
  const s = new Date(at.getTime() + IST_OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate() };
}

/** The instant an Indian calendar day began. Overflowing d or m rolls over, like Date.UTC. */
export function istMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);
}

/** The instant today began in India. */
export function startOfIstDay(at: Date = new Date()): Date {
  const { y, m, d } = istParts(at);
  return istMidnight(y, m, d);
}

export function addIstDays(dayStart: Date, n: number): Date {
  return new Date(dayStart.getTime() + n * DAY_MS);
}

/** "2026-09-27" for the Indian calendar day an instant falls on. */
export function istDayKey(at: Date | string): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** Formats an instant as its Indian calendar date, e.g. fmt(x, { day: 'numeric', month: 'short' }) -> "27 Sep". */
export function istFormat(at: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });
}
