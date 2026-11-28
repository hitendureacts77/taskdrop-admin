import { MoneyView } from '@/components/views/MoneyView';
import { PlanBMovesV2 } from '@/components/v2/money/PlanBMovesV2';
import { getAllTimeEarnings, getEscrowJobs, getLedger, getMoneyHeld, getMoneySettings, getPayoutQueue, getPlanBMoves, getPlanBOverview, requireSeeing } from '@/lib/data';
import { getEarningsSeries, parseRange } from '@/lib/earnings';
import { isTestRow } from '@/lib/test-data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Earnings and escrow' };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function MoneyPage({ searchParams }: { searchParams: SP }) {
  await requireSeeing('money');
  const sp = await searchParams;
  const range = parseRange(sp.range, 'month');
  const view = sp.view === 'types' ? 'types' : 'total';
  const [earnings, everything, allTime, settings, escrowAll, held, queue, ledgerAll, v2, hide] = await Promise.all([
    getEarningsSeries(range),
    range === 'all' ? null : getEarningsSeries('all'),
    getAllTimeEarnings(),
    getMoneySettings(),
    getEscrowJobs(),
    getMoneyHeld(),
    getPayoutQueue(),
    getLedger({ limit: 10 }),
    getV2(),
    getHideTestData(),
  ]);
  // Hide test data (v2 only; always false with the gate off): the escrow list, its tiles and the latest entries leave out fake seed and [e2e] jobs.
  const escrow = hide ? escrowAll.filter((j) => !isTestRow({ id: j.taskId, posterId: j.posterId, userId: j.workerId, title: j.title })) : escrowAll;
  const ledger = hide ? ledgerAll.filter((l) => !isTestRow({ id: l.taskId, title: l.title })) : ledgerAll;
  const moves = v2 ? await Promise.all([getPlanBOverview(), getPlanBMoves(80)]) : null;
  return (
    <MoneyView
      d={{
        now: new Date().toISOString(),
        view,
        earnings,
        allSplit: (everything ?? earnings).rangeSplit,
        allTime,
        settings,
        escrow,
        held,
        queueMinor: queue.reduce((a, p) => a + p.amount_minor, 0),
        ledger,
      }}
      afterEscrow={moves ? <PlanBMovesV2 overview={moves[0]} moves={moves[1]} hide={hide} /> : undefined}
    />
  );
}
