import { notFound } from 'next/navigation';
import { mfaState } from '@/lib/mfa';
import { PayoutDetailView } from '@/components/views/PayoutDetailView';
import { checkWithRazorpayX, giveBackPayout, markPayout } from '@/lib/actions';
import { getPayoutDetail, getPayoutMethod, getRazorpayXState, requireAdmin } from '@/lib/data';

export default async function PayoutPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const mfa = await mfaState();
  const d = await getPayoutDetail(id);
  if (!d) notFound();
  const open = d.p.status === 'requested' || d.p.status === 'processing';
  const [rx, method] = await Promise.all([
    open ? getRazorpayXState() : Promise.resolve({ configured: false, balanceMinor: null, error: null }),
    getPayoutMethod(),
  ]);
  return (
    <PayoutDetailView
      d={d}
      now={new Date().toISOString()}
      rx={rx}
      method={method}
      mfa={mfa}
      markPayout={markPayout}
      checkAll={checkWithRazorpayX}
      giveBack={giveBackPayout}
    />
  );
}
