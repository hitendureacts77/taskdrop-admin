import { notFound } from 'next/navigation';
import { mfaState } from '@/lib/mfa';
import { maskDestinationLabel, maskQueuedDestination } from '@/lib/payout-dest';
import { staffCan } from '@/lib/staff-roles';
import { PayoutDetailView } from '@/components/views/PayoutDetailView';
import { checkWithRazorpayX, giveBackPayout, markPayout } from '@/lib/actions';
import { getPayoutDetail, getPayoutMethod, getRazorpayXState, requireSeeing } from '@/lib/data';

export const metadata = { title: 'Withdrawal' };

export default async function PayoutPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireSeeing('money');
  const { id } = await params;
  const sp = await searchParams;
  // The method and the MFA state do not depend on the withdrawal, so they are read while it loads.
  const canPay = staffCan(me.staffRole, 'money');
  const [mfa, detail, method] = await Promise.all([mfaState(), getPayoutDetail(id), getPayoutMethod()]);
  if (!detail) notFound();
  // Roles that cannot pay never receive the full UPI id, bank account or IFSC (S7-16).
  const d = canPay
    ? detail
    : { ...detail, p: { ...detail.p, destination: maskDestinationLabel(detail.p.destination) }, queued: detail.queued ? maskQueuedDestination(detail.queued) : null, others: detail.others.map((o) => ({ ...o, destination: maskDestinationLabel(o.destination) })) };
  const open = d.p.status === 'requested' || d.p.status === 'processing';
  const rx = open ? await getRazorpayXState() : { configured: false, balanceMinor: null, error: null };
  return (
    <PayoutDetailView
      d={d}
      now={new Date().toISOString()}
      rx={rx}
      method={method}
      mfa={mfa}
      canPay={canPay}
      useCurrent={sp.use === 'current'}
      markPayout={markPayout}
      checkAll={checkWithRazorpayX}
      giveBack={giveBackPayout}
    />
  );
}
