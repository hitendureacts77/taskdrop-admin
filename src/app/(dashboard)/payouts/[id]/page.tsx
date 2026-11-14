import { notFound } from 'next/navigation';
import { mfaState } from '@/lib/mfa';
import { staffCan } from '@/lib/staff-roles';
import { PayoutDetailView } from '@/components/views/PayoutDetailView';
import { checkWithRazorpayX, giveBackPayout, markPayout } from '@/lib/actions';
import { getPayoutDetail, getPayoutMethod, getRazorpayXState, requireSeeing } from '@/lib/data';

export default async function PayoutPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireSeeing('money');
  const { id } = await params;
  const sp = await searchParams;
  // The method and the MFA state do not depend on the withdrawal, so they are read while it loads.
  const [mfa, d, method] = await Promise.all([mfaState(), getPayoutDetail(id), getPayoutMethod()]);
  if (!d) notFound();
  const open = d.p.status === 'requested' || d.p.status === 'processing';
  const rx = open ? await getRazorpayXState() : { configured: false, balanceMinor: null, error: null };
  return (
    <PayoutDetailView
      d={d}
      now={new Date().toISOString()}
      rx={rx}
      method={method}
      mfa={mfa}
      canPay={staffCan(me.staffRole, 'money')}
      useCurrent={sp.use === 'current'}
      markPayout={markPayout}
      checkAll={checkWithRazorpayX}
      giveBack={giveBackPayout}
    />
  );
}
