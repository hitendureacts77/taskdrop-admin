import { Suspense } from 'react';
import { DevicesToolsCard } from '@/components/DevicesToolsCard';
import { SystemHealthCard, SystemHealthSkeleton } from '@/components/SystemHealthCard';
import { DashboardView } from '@/components/views/DashboardView';
import { SalesDashboardView } from '@/components/views/SalesDashboardView';
import { getDevSignInOn } from '@/components/v2/dashboard/data';
import { V2Dashboard } from '@/components/v2/dashboard/V2Dashboard';
import { V2SalesDashboard } from '@/components/v2/dashboard/V2SalesDashboard';
import * as v2ui from '@/components/v2/ui';
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
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Dashboard' };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const v2 = await getV2();
  // Sales gets a dashboard of customers and jobs; none of the money below is even read for them.
  if (!staffCanSee(me.staffRole, 'money')) {
    const today = await getTodayCounts();
    const now = new Date().toISOString();
    return v2 ? <V2SalesDashboard today={today} now={now} /> : <SalesDashboardView today={today} now={now} />;
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
  const d = {
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
  };
  const health = (
    <Suspense fallback={v2 ? <v2ui.Card title="System health"><v2ui.Loading lines={4} label="Loading system health" /></v2ui.Card> : <SystemHealthSkeleton />}>
      <SystemHealthCard />
    </Suspense>
  );
  const devices = (
    <Suspense fallback={null}>
      <DevicesToolsCard />
    </Suspense>
  );

  if (v2) {
    const [devSignIn, hideTest] = await Promise.all([getDevSignInOn(), getHideTestData()]);
    return <V2Dashboard d={d} health={health} devices={devices} devSignIn={devSignIn} hideTest={hideTest} />;
  }
  return <DashboardView d={d} health={health} devices={devices} />;
}
