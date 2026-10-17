import { RefundsView } from '@/components/views/QueuesViews';
import { sendRefund } from '@/lib/actions';
import { getRefundsOwed, requireSeeing } from '@/lib/data';

export default async function RefundsPage() {
  await requireSeeing('money');
  const rows = await getRefundsOwed();
  return <RefundsView rows={rows} sendRefund={sendRefund} />;
}
