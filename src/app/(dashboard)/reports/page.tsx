import { ReportsView } from '@/components/views/MoreViews';
import { getEarnedSince, getPlatformStats, requireAdmin } from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ReportsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = Number(Array.isArray(sp.days) ? sp.days[0] : sp.days);
  const days = [7, 30, 90, 365].includes(raw) ? raw : 30;
  const [stats, earnedMinor] = await Promise.all([getPlatformStats(days), getEarnedSince(new Date(Date.now() - days * 86400000))]);
  return <ReportsView s={stats} days={days} earnedMinor={earnedMinor} />;
}
