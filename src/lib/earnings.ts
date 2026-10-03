import 'server-only';
import { createClient } from './supabase/server';
import { istDayKey } from './days';

/**
 * TaskDrop's own earnings over time, from platform_ledger.
 *
 * Every range is built from one list of per-day totals (Indian calendar days),
 * which are then grouped into days, weeks or months. The per-day totals come
 * from admin_earnings_daily() when migration 060 is applied -- one small query
 * however long the history -- and otherwise from reading the ledger rows and
 * adding them up here, which gives the same numbers but gets slower as the
 * ledger grows.
 */

// ------------------------------------------------------------------ split --

export type Split = { commission: number; fee: number; promotions: number; other: number; total: number };
export const emptySplit = (): Split => ({ commission: 0, fee: 0, promotions: 0, other: 0, total: 0 });

export function addToSplit(s: Split, kind: string, amount: number) {
  if (kind === 'worker_commission') s.commission += amount;
  else if (kind === 'poster_fee') s.fee += amount;
  else if (kind === 'ad_revenue') s.promotions += amount;
  else s.other += amount; // corrections, and any kind added later
  s.total += amount;
}

function mergeInto(into: Split, from: Split) {
  into.commission += from.commission;
  into.fee += from.fee;
  into.promotions += from.promotions;
  into.other += from.other;
  into.total += from.total;
}

// ------------------------------------------------------------------ ranges --

export type RangeKey = '7d' | 'month' | 'lastmonth' | '3m' | '1y' | '5y' | 'all';

/** Calendar words a person would use, each with a named, dated comparison (never just "previous period"). */
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastmonth', label: 'Last month' },
  { key: '3m', label: '3 months' },
  { key: '1y', label: '1 year' },
  { key: '5y', label: '5 years' },
  { key: 'all', label: 'All time' },
];

export function parseRange(v: string | string[] | undefined, fallback: RangeKey = 'month'): RangeKey {
  const s = Array.isArray(v) ? v[0] : v;
  return RANGES.some((r) => r.key === s) ? (s as RangeKey) : fallback;
}

// ------------------------------------------------------------ day-key math --
// Day keys are "YYYY-MM-DD" Indian calendar dates. They compare correctly as
// strings, and doing arithmetic on them in UTC avoids every timezone trap.

const toDate = (key: string) => new Date(`${key}T00:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(key: string, n: number): string {
  const d = toDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
}

function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return toKey(new Date(Date.UTC(y, m - 1 + n, 1)));
}

const monthStart = (key: string) => `${key.slice(0, 7)}-01`;

function fmt(key: string, opts: Intl.DateTimeFormatOptions): string {
  return toDate(key).toLocaleDateString('en-IN', { timeZone: 'UTC', ...opts });
}

const dayMonth = (key: string) => fmt(key, { day: 'numeric', month: 'short' });
const dayMonthYear = (key: string) => fmt(key, { day: 'numeric', month: 'short', year: 'numeric' });
const weekdayDayMonth = (key: string) => fmt(key, { weekday: 'short', day: 'numeric', month: 'short' });

function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

// ----------------------------------------------------------------- buckets --

type Unit = 'day' | 'week' | 'month';
type Bucket = { from: string; to: string; short: string; long: string };

function dayBuckets(today: string, n: number, shift: number, weekdayLabels: boolean): Bucket[] {
  const out: Bucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = addDays(today, -(i + shift));
    const isToday = k === today;
    out.push({
      from: k,
      to: addDays(k, 1),
      short: isToday ? 'Today' : weekdayLabels ? fmt(k, { weekday: 'short', day: 'numeric' }) : dayMonth(k),
      long: isToday ? `Today, ${dayMonth(k)}` : weekdayDayMonth(k),
    });
  }
  return out;
}

/** n days starting on a given day (for calendar months). */
function daysFrom(startKey: string, n: number, today: string): Bucket[] {
  const out: Bucket[] = [];
  for (let i = 0; i < n; i++) {
    const k = addDays(startKey, i);
    const isToday = k === today;
    out.push({ from: k, to: addDays(k, 1), short: isToday ? 'Today' : dayMonth(k), long: isToday ? `Today, ${dayMonth(k)}` : weekdayDayMonth(k) });
  }
  return out;
}

function daysInMonthOf(key: string): number {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Seven-day blocks ending today (the last block is "this week", i.e. the last 7 days). */
function weekBuckets(today: string, n: number, shiftDays: number): Bucket[] {
  const out: Bucket[] = [];
  for (let j = 0; j < n; j++) {
    const end = addDays(today, -(n - 1 - j) * 7 - shiftDays);
    const from = addDays(end, -6);
    const isNow = end === today;
    out.push({
      from,
      to: addDays(end, 1),
      short: isNow ? 'This week' : dayMonth(from),
      long: `${dayMonth(from)} – ${isNow ? 'today' : dayMonth(end)}`,
    });
  }
  return out;
}

function monthBuckets(today: string, n: number, shiftMonths: number): Bucket[] {
  const cur = monthStart(today);
  const out: Bucket[] = [];
  for (let j = 0; j < n; j++) {
    const from = addMonths(cur, -(n - 1 - j) - shiftMonths);
    const isNow = from === cur;
    out.push({
      from,
      to: addMonths(from, 1),
      short: isNow ? 'This month' : fmt(from, { month: 'short' }),
      long: isNow ? `${fmt(from, { month: 'long', year: 'numeric' })} (so far)` : fmt(from, { month: 'long', year: 'numeric' }),
    });
  }
  return out;
}

function spanOf(buckets: Bucket[]): string {
  if (!buckets.length) return '';
  const first = buckets[0]!.from;
  const last = addDays(buckets[buckets.length - 1]!.to, -1);
  return `${dayMonth(first)}${first.slice(0, 4) !== last.slice(0, 4) ? ` ${first.slice(0, 4)}` : ''} – ${dayMonthYear(last)}`;
}

export type Tick = { index: number; text: string };

/** Which points get a date under the chart, so the axis reads cleanly at every range. */
function ticksFor(unit: Unit, buckets: Bucket[]): Tick[] {
  const n = buckets.length;
  const at = (i: number, text?: string): Tick => ({ index: i, text: text ?? buckets[i]!.short });
  if (n <= 1) return n ? [at(0)] : [];

  if (unit === 'day' && n <= 8) return buckets.map((_, i) => at(i));
  if (unit === 'week' || unit === 'day') {
    const every = unit === 'week' ? 2 : Math.max(1, Math.round(n / 6));
    const out: Tick[] = [];
    for (let i = n - 1; i >= 0; i -= every) out.unshift(at(i));
    if (out[0]!.index >= Math.ceil(every / 2)) out.unshift(at(0));
    else if (out[0]!.index !== 0) out[0] = at(0);
    return out;
  }

  // months
  const year = (b: Bucket) => b.from.slice(0, 4);
  const shortYear = (b: Bucket) => `'${b.from.slice(2, 4)}`;
  if (n <= 13) {
    return buckets.map((b, i) => {
      if (i === n - 1) return at(i);
      const withYear = i === 0 || b.from.slice(5, 7) === '01';
      return at(i, withYear ? `${b.short} ${shortYear(b)}` : b.short);
    });
  }
  // Long ranges: one mark per year, on January, plus the start and "now".
  const out: Tick[] = [at(0, `${buckets[0]!.short} ${year(buckets[0]!)}`)];
  buckets.forEach((b, i) => {
    if (i > 0 && i < n - 1 && b.from.slice(5, 7) === '01' && i - out[out.length - 1]!.index >= 4) out.push(at(i, year(b)));
  });
  if (n - 1 - out[out.length - 1]!.index < 4 && out.length > 1) out.pop();
  out.push(at(n - 1, 'Now'));
  return out;
}

// ------------------------------------------------------------------- data --

type DailyRow = { day: string; kind: string; amount_minor: number };

async function dailyTotals(sinceKey: string): Promise<Map<string, Split>> {
  const supabase = await createClient();
  const byDay = new Map<string, Split>();
  const add = (day: string, kind: string, amount: number) => {
    const s = byDay.get(day) ?? emptySplit();
    addToSplit(s, kind, amount);
    byDay.set(day, s);
  };

  // Preferred: added up by the database (migration 060).
  // Bound: rpc is a method that needs its client as `this`.
  type RpcFn = (
    fn: string,
    args: Record<string, unknown>,
  ) => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> };
  const rpc = (supabase.rpc as unknown as RpcFn).bind(supabase);
  let usedRpc = true;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await rpc('admin_earnings_daily', { p_since: sinceKey }).range(from, from + 999);
    if (error) {
      // PGRST202: the function isn't there yet. Anything else is a real failure.
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) {
        usedRpc = false;
        byDay.clear();
        break;
      }
      throw new Error(`Could not read the company ledger: ${error.message}`);
    }
    const page = (data ?? []) as DailyRow[];
    for (const r of page) add(String(r.day).slice(0, 10), r.kind, Number(r.amount_minor));
    if (page.length < 1000) break;
  }
  if (usedRpc) return byDay;

  // Fallback: read every ledger row since then and add them up here.
  const sinceInstant = new Date(toDate(sinceKey).getTime() - 330 * 60 * 1000); // IST midnight
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('platform_ledger')
      .select('kind, amount_minor, created_at')
      .gte('created_at', sinceInstant.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Could not read the company ledger: ${error.message}`);
    const page = (data ?? []) as { kind: string; amount_minor: number; created_at: string }[];
    for (const r of page) add(istDayKey(r.created_at), r.kind, Number(r.amount_minor));
    if (page.length < 1000) break;
  }
  return byDay;
}

async function firstEarningDay(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('platform_ledger')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const row = data as { created_at: string } | null;
  return row ? istDayKey(row.created_at) : null;
}

// ------------------------------------------------------------------ series --

export type SeriesPoint = {
  short: string;
  long: string;
  split: Split;
  /** The matching point in the comparison period, when there is one. */
  prev: number | null;
  prevLong: string | null;
};

export type EarningsSeries = {
  range: RangeKey;
  unit: Unit;
  points: SeriesPoint[];
  ticks: Tick[];
  sum: number;
  prevSum: number | null;
  rangeSplit: Split;
  /** "29 Aug – 27 Sep 2026" */
  span: string;
  prevSpan: string | null;
  /** "Previous month" -- what the grey line is, in words. */
  prevName: string | null;
  firstEarningDay: string | null;
  today: Split;
  yesterday: number;
};

export async function getEarningsSeries(range: RangeKey, now: Date = new Date()): Promise<EarningsSeries> {
  const today = istDayKey(now);
  const first = await firstEarningDay();

  let unit: Unit;
  let cur: Bucket[];
  let prev: Bucket[] | null = null;
  /** When the comparison line can't show the whole comparison period point for point (31 Jan vs 28 Feb), its total comes from here. */
  let prevWhole: Bucket | null = null;
  let prevName: string | null = null;
  const monthWord = (key: string) => fmt(key, { month: 'long' });
  const monthYear = (key: string) => fmt(key, { month: 'long', year: 'numeric' });
  switch (range) {
    case '7d':
      unit = 'day';
      cur = dayBuckets(today, 7, 0, true);
      prev = dayBuckets(today, 7, 7, true);
      prevName = 'The 7 days before';
      break;
    case 'month': {
      // 1st of this month to today, against the same dates last month.
      unit = 'day';
      const start = monthStart(today);
      const n = daysBetween(start, today) + 1;
      const prevStart = addMonths(start, -1);
      cur = daysFrom(start, n, today);
      prev = daysFrom(prevStart, Math.min(n, daysInMonthOf(prevStart)), today);
      prevName = `Same days in ${monthWord(prevStart)}`;
      break;
    }
    case 'lastmonth': {
      unit = 'day';
      const start = addMonths(monthStart(today), -1);
      const n = daysInMonthOf(start);
      const prevStart = addMonths(start, -1);
      cur = daysFrom(start, n, today);
      prev = daysFrom(prevStart, Math.min(n, daysInMonthOf(prevStart)), today);
      prevWhole = { from: prevStart, to: start, short: '', long: '' };
      prevName = monthYear(prevStart);
      break;
    }
    case '3m':
      unit = 'week';
      cur = weekBuckets(today, 13, 0);
      prev = weekBuckets(today, 13, 91);
      prevName = 'The 3 months before';
      break;
    case '1y':
      unit = 'month';
      cur = monthBuckets(today, 12, 0);
      prev = monthBuckets(today, 12, 12);
      {
        // This month is only partly over, so compare it with the same days a year ago.
        const [y, m, d] = today.split('-').map(Number) as [number, number, number];
        const lastYear = toKey(new Date(Date.UTC(y - 1, m - 1, Math.min(d, new Date(Date.UTC(y - 1, m, 0)).getUTCDate()))));
        const last = prev[prev.length - 1]!;
        prev[prev.length - 1] = { ...last, to: addDays(lastYear, 1), long: `${last.long} (to ${dayMonth(lastYear)})` };
      }
      prevName = 'The 12 months before';
      break;
    case '5y':
      unit = 'month';
      cur = monthBuckets(today, 60, 0);
      break;
    default: {
      // All time: from the first rupee TaskDrop earned, at a sensible grain.
      const start = first ?? today;
      const span = daysBetween(start, today) + 1;
      if (span <= 62) {
        unit = 'day';
        cur = dayBuckets(today, Math.max(span, 7), 0, false);
      } else if (span <= 26 * 7) {
        unit = 'week';
        cur = weekBuckets(today, Math.ceil(span / 7), 0);
      } else {
        unit = 'month';
        const months = (Number(today.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(today.slice(5, 7)) - Number(start.slice(5, 7)) + 1;
        cur = monthBuckets(today, months, 0);
      }
    }
  }

  const earliest = (prev ?? cur)[0]!.from < cur[0]!.from ? (prev ?? cur)[0]!.from : cur[0]!.from;
  const since = earliest < addDays(today, -1) ? earliest : addDays(today, -1);
  const byDay = await dailyTotals(since);

  const sumBucket = (b: Bucket): Split => {
    const s = emptySplit();
    for (const [day, split] of byDay) if (day >= b.from && day < b.to) mergeInto(s, split);
    return s;
  };

  const points: SeriesPoint[] = cur.map((b, i) => {
    const p = prev?.[i];
    return {
      short: b.short,
      long: b.long,
      split: sumBucket(b),
      prev: p ? sumBucket(p).total : null,
      prevLong: p ? p.long : null,
    };
  });

  const rangeSplit = emptySplit();
  for (const p of points) mergeInto(rangeSplit, p.split);

  return {
    range,
    unit,
    points,
    ticks: ticksFor(unit, cur),
    sum: rangeSplit.total,
    prevSum: prevWhole ? sumBucket(prevWhole).total : prev ? points.reduce((a, p) => a + (p.prev ?? 0), 0) : null,
    rangeSplit,
    span: spanOf(cur),
    prevSpan: prevWhole ? spanOf([prevWhole]) : prev ? spanOf(prev) : null,
    prevName: prev ? prevName : null,
    firstEarningDay: first,
    today: byDay.get(today) ?? emptySplit(),
    yesterday: byDay.get(addDays(today, -1))?.total ?? 0,
  };
}

/** "21 Sep 2026" for a day key. */
export function prettyDay(key: string): string {
  return dayMonthYear(key);
}
