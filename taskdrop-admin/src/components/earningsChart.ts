import type { EarningsSeries, RangeKey } from '@/lib/earnings';
import { RANGES } from '@/lib/earnings';
import { CHART_COLORS } from '@/lib/labels';
import type { ChartSeries } from './LineChart';
import type { TabItem } from './ui';

/** What the main line is called, in the words on the range button. */
export function currentName(range: RangeKey, now: Date = new Date()): string {
  switch (range) {
    case '7d':
      return 'Last 7 days';
    case 'month':
      return now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'long' }) + ' so far';
    case 'lastmonth': {
      const d = new Date(now.getTime() + 330 * 60000);
      const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
      return first.toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' });
    }
    case '3m':
      return 'Last 3 months';
    case '1y':
      return 'Last 12 months';
    case '5y':
      return 'Last 5 years';
    default:
      return 'All time';
  }
}

/** "the same days in August", "the 7 days before" -- for "than …" sentences. */
export function versus(prevName: string | null): string {
  if (!prevName) return 'before';
  if (prevName.startsWith('The ')) return `the ${prevName.slice(4)}`;
  if (prevName.startsWith('Same ')) return `the same ${prevName.slice(5)}`;
  return prevName;
}

export function earningsChart(e: EarningsSeries, view: 'total' | 'types') {
  const labels = e.points.map((p) => p.long);
  const name = currentName(e.range);
  let series: ChartSeries[];
  if (view === 'types') {
    series = [
      { name: 'Commission', color: CHART_COLORS.commission, values: e.points.map((p) => p.split.commission) },
      { name: 'Service fee', color: CHART_COLORS.fee, values: e.points.map((p) => p.split.fee) },
      { name: 'Promotions', color: CHART_COLORS.promotions, values: e.points.map((p) => p.split.promotions) },
    ];
    if (e.points.some((p) => p.split.other !== 0)) {
      series.push({ name: 'Corrections', color: '#6b6b6b', values: e.points.map((p) => p.split.other), dashed: true });
    }
  } else {
    series = [{ name, color: CHART_COLORS.total, values: e.points.map((p) => p.split.total), area: true }];
    if (e.prevName) {
      series.push({
        name: e.prevName,
        color: CHART_COLORS.previous,
        values: e.points.map((p) => p.prev),
        dashed: true,
        pointLabels: e.points.map((p) => p.prevLong),
      });
    }
  }
  return { labels, ticks: e.ticks, series, name };
}

export function rangeTabs(base: string, current: RangeKey, keep: Record<string, string | undefined> = {}): TabItem[] {
  return RANGES.map((r) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) params.set(k, v);
    params.set('range', r.key);
    return { href: `${base}?${params.toString()}`, label: r.label, active: r.key === current };
  });
}
