import { DisputesView } from '@/components/views/QueuesViews';
import { DisputesV2 } from '@/components/v2/jobs/DisputesV2';
import { countDisputes, getDisputes, requireSeeing } from '@/lib/data';
import { getHeldByTask } from '@/lib/data/tasks';
import { staffCan } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Disputes' };

export default async function DisputesPage() {
  const me = await requireSeeing('money');
  const [rows, total, v2] = await Promise.all([getDisputes(), countDisputes(), getV2()]);
  if (v2) {
    const [held, hideTest] = await Promise.all([getHeldByTask(rows.map((r) => r.taskId)), getHideTestData()]);
    return <DisputesV2 rows={rows} total={total} now={new Date().toISOString()} heldByTask={held} hideTest={hideTest} canDecide={staffCan(me.staffRole, 'money')} />;
  }
  return <DisputesView rows={rows} total={total} now={new Date().toISOString()} />;
}
