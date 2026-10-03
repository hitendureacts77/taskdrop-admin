import { RefundsView } from '@/components/views/QueuesViews';
import { sendRefund } from '@/lib/actions';
import { getRefundsOwed, requireAdmin } from '@/lib/data';

export default async function RefundsPage() {
  await requireAdmin();
  const rows = await getRefundsOwed();
  return <RefundsView rows={rows} sendRefund={sendRefund} />;
}
