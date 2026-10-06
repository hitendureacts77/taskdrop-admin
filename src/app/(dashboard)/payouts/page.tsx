import { mfaState } from '@/lib/mfa';
import { PayoutsView } from '@/components/views/PayoutsView';
import { checkWithRazorpayX, setPayoutMethod } from '@/lib/actions';
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
  requireAdmin,
} from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;

const CHART_DAYS = [7, 30, 90];

export default async function PayoutsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
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

  const mfa = await mfaState();
  const [queue, totals, history, position, rx, method, daily, dayRows] = await Promise.all([
    getPayoutQueue(),
    getPayoutTotals(),
    getSettledPayouts(new Date(Date.now() - 30 * 86400000), 1000),
    getMoneyPosition(),
    getRazorpayXState(),
    getPayoutMethod(),
    getWithdrawalRequestsDaily(days),
    day ? getWithdrawalRequestsOn(day) : Promise.resolve([]),
  ]);
  const roles = await getRolesFor([...queue.map((p) => p.user_id), ...history.map((h) => h.user_id), ...dayRows.map((r) => r.user_id)]);
  const dayLabel = day ? (daily.find((x) => x.key === day)?.long ?? day) : '';
  // Oldest request first: whoever has waited longest is looked at first.
  const ordered = [...queue].sort((a, b) => a.requested_at.localeCompare(b.requested_at));
  return (
    <PayoutsView
      d={{ now: new Date().toISOString(), queue: ordered, totals, history, position, rx, method, daily, days, roles, day, dayLabel, dayRows, q, hist, histPage }}
      mfa={mfa}
      checkAll={checkWithRazorpayX}
      setMethod={setPayoutMethod}
    />
  );
}
