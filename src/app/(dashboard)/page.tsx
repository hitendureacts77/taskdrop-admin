import { DashboardView } from '@/components/views/DashboardView';
import {
  getAllTimeEarnings,
  getEscrowJobs,
  getLatestMovements,
  getMoneyHeld,
  getMoneySettings,
  getNavCounts,
  getPayoutQueue,
  getPayoutTotals,
  getTodayCounts,
  requireAdmin,
} from '@/lib/data';
import { getEarningsSeries, parseRange } from '@/lib/earnings';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const range = parseRange(sp.range, 'month');
  const [earnings, allTime, settings, escrow, queue, payoutTotals, held, today, movements, nav] = await Promise.all([
    getEarningsSeries(range),
    getAllTimeEarnings(),
    getMoneySettings(),
    getEscrowJobs(),
    getPayoutQueue(),
    getPayoutTotals(),
    getMoneyHeld(),
    getTodayCounts(),
    getLatestMovements(8),
    getNavCounts(),
  ]);
  return (
    <DashboardView
      d={{
        now: new Date().toISOString(),
        earnings,
        allTime,
        settings,
        escrow,
        queue,
        payoutTotals,
        held,
        today,
        movements,
        disputes: nav.disputes,
        support: nav.support,
      }}
    />
  );
}
