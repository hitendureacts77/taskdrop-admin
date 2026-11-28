import { RefundsView } from '@/components/views/QueuesViews';
import { RefundsV2 } from '@/components/v2/money/RefundsV2';
import { sendRefund } from '@/lib/actions';
import { getRefundsOwed, requireSeeing } from '@/lib/data';
import { isTestRow } from '@/lib/test-data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Refunds' };

export default async function RefundsPage() {
  await requireSeeing('money');
  const [rows, v2] = await Promise.all([getRefundsOwed(), getV2()]);
  if (!v2) return <RefundsView rows={rows} sendRefund={sendRefund} />;
  const hide = await getHideTestData();
  const kept = rows && hide ? rows.filter((r) => !isTestRow({ id: r.taskId, posterId: r.posterId, title: r.title })) : rows;
  return <RefundsV2 rows={kept} all={rows?.length ?? 0} sendRefund={sendRefund} />;
}
