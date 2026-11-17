import { mfaState } from '@/lib/mfa';
import { PayoutsView } from '@/components/views/PayoutsView';
import { checkWithRazorpayX, setPayoutMethod } from '@/lib/actions';
import { staffCan } from '@/lib/staff-roles';
import { maskDestinationLabel, maskQueuedDestination } from '@/lib/payout-dest';
import {
  getMoneyPosition,
  getPayoutMethod,
  getPayoutQueue,
  getPayoutTotals,
  getRazorpayXState,
  getRolesFor,
  getSettledPayouts,
  getWithdrawalRequestsDaily,
  getWithdrawalRequestsOn,
  requireSeeing,
} from '@/lib/data';

export const metadata = { title: 'Payouts' };

type SP = Promise<Record<string, string | string[] | undefined>>;

const CHART_DAYS = [7, 30, 90];

export default async function PayoutsPage({ searchParams }: { searchParams: SP }) {
  const me = await requireSeeing('money');
  const sp = await searchParams;
  const asked = Number(Array.isArray(sp.days) ? sp.days[0] : sp.days);
  const days = CHART_DAYS.includes(asked) ? asked : 30;
  const dayParam = Array.isArray(sp.day) ? sp.day[0] : sp.day;
  const day = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const q = one(sp.q).slice(0, 80);
  const histParam = one(sp.hist);
  const hist = histParam === 'paid' || histParam === 'failed' || histParam === 'cancelled' ? histParam : 'all';
  const histPage = Math.max(0, Math.floor(Number(one(sp.hp)) || 0));

  const canPay = staffCan(me.staffRole, 'money');
  const [mfa, queueFull, totals, historyFull, pos, rx, method, daily, dayRowsFull] = await Promise.all([
    mfaState(),
    getPayoutQueue(),
    getPayoutTotals(),
    getSettledPayouts(new Date(Date.now() - 30 * 86400000), 1000),
    getMoneyPosition(),
    getRazorpayXState(),
    getPayoutMethod(),
    getWithdrawalRequestsDaily(days),
    day ? getWithdrawalRequestsOn(day) : Promise.resolve([]),
  ]);
  // Roles that cannot pay never receive the full UPI id, bank account or IFSC (S7-16).
  const queue = canPay ? queueFull : queueFull.map(maskQueuedDestination);
  const hideDest = <T extends { destination: string | null }>(r: T): T => ({ ...r, destination: maskDestinationLabel(r.destination) });
  const history = canPay ? historyFull : historyFull.map(hideDest);
  const dayRows = canPay ? dayRowsFull : dayRowsFull.map(hideDest);
  const roles = await getRolesFor([...queue.map((p) => p.user_id), ...history.map((h) => h.user_id), ...dayRows.map((r) => r.user_id)]);
  const dayLabel = day ? (daily.find((x) => x.key === day)?.long ?? day) : '';
  // Oldest request first: whoever has waited longest is looked at first.
  const ordered = [...queue].sort((a, b) => a.requested_at.localeCompare(b.requested_at));
  return (
    <PayoutsView
      d={{ now: new Date().toISOString(), queue: ordered, totals, history, position: pos.position, positionError: pos.error, rx, method, daily, days, roles, day, dayLabel, dayRows, q, hist, histPage }}
      mfa={mfa}
      canPay={canPay}
      checkAll={checkWithRazorpayX}
      setMethod={setPayoutMethod}
    />
  );
}
