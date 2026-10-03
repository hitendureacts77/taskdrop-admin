import { PayoutsView } from '@/components/views/PayoutsView';
import { checkWithRazorpayX, giveBackPayout, markPayout } from '@/lib/actions';
import { getMoneyPosition, getPayoutQueue, getPayoutTotals, getRazorpayXState, getSettledPayouts, requireAdmin } from '@/lib/data';

export default async function PayoutsPage() {
  await requireAdmin();
  const [queue, totals, history, position, rx] = await Promise.all([
    getPayoutQueue(),
    getPayoutTotals(),
    getSettledPayouts(new Date(Date.now() - 30 * 86400000), 100),
    getMoneyPosition(),
    getRazorpayXState(),
  ]);
  // Oldest request first: whoever has waited longest is looked at first.
  const ordered = [...queue].sort((a, b) => a.requested_at.localeCompare(b.requested_at));
  return (
    <PayoutsView
      d={{ now: new Date().toISOString(), queue: ordered, totals, history, position, rx }}
      markPayout={markPayout}
      checkAll={checkWithRazorpayX}
      giveBack={giveBackPayout}
    />
  );
}
