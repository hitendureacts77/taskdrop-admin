import { Suspense } from 'react';
import { SystemHealthCard, SystemHealthSkeleton } from '@/components/SystemHealthCard';
import { DashboardView } from '@/components/views/DashboardView';
import { SalesDashboardView } from '@/components/views/SalesDashboardView';
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
import { staffCanSee } from '@/lib/staff-roles';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  // Sales gets a dashboard of customers and jobs; none of the money below is even read for them.
  if (!staffCanSee(me.staffRole, 'money')) {
    return <SalesDashboardView today={await getTodayCounts()} now={new Date().toISOString()} />;
  }
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
      health={
        <Suspense fallback={<SystemHealthSkeleton />}>
          <SystemHealthCard />
        </Suspense>
      }
    />
  );
}
