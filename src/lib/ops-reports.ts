/**
 * Pure helpers for the v2 Business reports page (admin v2, WP7).
 * No database access, so they are unit-tested in ops-calc.test.ts.
 */
import type { DailyRow } from './growth-calc';

export type ChartUnit = 'day' | 'week' | 'month';

export type ChartBucket = { key: string; label: string; fundedMinor: number; revenueMinor: number };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 7 and 30 days read per day, 90 days per week, a year per month. */
export function chartUnit(days: number): ChartUnit {
  if (days >= 365) return 'month';
  if (days >= 90) return 'week';
  return 'day';
}

/** "3 Nov" from an ISO day. */
export function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}`.trim();
}

/** "Nov 2026" from an ISO day. */
function monthLabel(iso: string): string {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1] ?? ''} ${y}`.trim();
}

/**
 * Groups the per-day business rows for the chart: per day, per block of 7 days
 * counted from the first day ("Week of 3 Nov"), or per calendar month.
 * Rows are taken in date order; the money sums are kept exact (minor units).
 */
export function chartBuckets(rows: readonly DailyRow[], days: number): ChartBucket[] {
  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
  const unit = chartUnit(days);
  const out: ChartBucket[] = [];
  const byKey = new Map<string, ChartBucket>();
  sorted.forEach((r, i) => {
    let key: string;
    let label: string;
    if (unit === 'day') {
      key = r.day;
      label = dayLabel(r.day);
    } else if (unit === 'week') {
      const first = sorted[i - (i % 7)]!;
      key = `w:${first.day}`;
      label = `Week of ${dayLabel(first.day)}`;
    } else {
      key = r.day.slice(0, 7);
      label = monthLabel(r.day);
    }
    let b = byKey.get(key);
    if (!b) {
      b = { key, label, fundedMinor: 0, revenueMinor: 0 };
      byKey.set(key, b);
      out.push(b);
    }
    b.fundedMinor += r.fundedMinor;
    b.revenueMinor += r.revenueMinor;
  });
  return out;
}

/** platform_stats has returned the quote share both as 0.81 and as 81; always give a fraction. */
export function quotedShare(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return raw > 1 ? raw / 100 : raw;
}

/** How strongly to tint a retention cell (0 to 45 % of jade), from a 0..1 share. */
export function retentionTint(share: number | null): number {
  if (share === null || !Number.isFinite(share)) return 0;
  return Math.round(Math.min(1, Math.max(0, share)) * 45);
}

/** Change as a whole-number percent vs the window before, or null when there is nothing to compare with. */
export function changePct(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
