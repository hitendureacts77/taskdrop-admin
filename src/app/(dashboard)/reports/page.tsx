import { GrowthReports } from '@/components/views/AnalyticsViews';
import { ReportsView } from '@/components/views/MoreViews';
import { addIstDays, istDayKey, startOfIstDay } from '@/lib/days';
import { getEarnedSince, getPlatformStats, requireSeeing } from '@/lib/data';
import { getBusinessDaily, getFunnel, getPromotionRoi, getRetention } from '@/lib/growth';
import { previousWindow } from '@/lib/growth-calc';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ReportsPage({ searchParams }: { searchParams: SP }) {
  await requireSeeing('money');
  const sp = await searchParams;
  const raw = Number(Array.isArray(sp.days) ? sp.days[0] : sp.days);
  const days = [7, 30, 90, 365].includes(raw) ? raw : 30;
  const to = istDayKey(startOfIstDay());
  const from = istDayKey(addIstDays(startOfIstDay(), -(days - 1)));
  const prev = previousWindow(from, to);
  const [stats, earnedMinor, daily, previous, funnel, retention, promo] = await Promise.all([
    getPlatformStats(days),
    getEarnedSince(new Date(Date.now() - days * 86400000)),
    getBusinessDaily(from, to),
    getBusinessDaily(prev.from, prev.to),
    getFunnel(from, to),
    getRetention(8),
    getPromotionRoi(from, to),
  ]);
  return (
    <>
      <ReportsView s={stats} days={days} earnedMinor={earnedMinor} />
      <GrowthReports days={days} daily={daily} previous={previous} funnel={funnel} retention={retention} promo={promo} />
    </>
  );
}
