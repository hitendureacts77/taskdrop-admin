import { MoneyView } from '@/components/views/MoneyView';
import { getAllTimeEarnings, getEscrowJobs, getLedger, getMoneyHeld, getMoneySettings, getPayoutQueue, requireAdmin } from '@/lib/data';
import { getEarningsSeries, parseRange } from '@/lib/earnings';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function MoneyPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const range = parseRange(sp.range, 'month');
  const view = sp.view === 'types' ? 'types' : 'total';
  const [earnings, everything, allTime, settings, escrow, held, queue, ledger] = await Promise.all([
    getEarningsSeries(range),
    range === 'all' ? null : getEarningsSeries('all'),
    getAllTimeEarnings(),
    getMoneySettings(),
    getEscrowJobs(),
    getMoneyHeld(),
    getPayoutQueue(),
    getLedger({ limit: 10 }),
  ]);
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
    />
  );
}
