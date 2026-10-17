import { notFound } from 'next/navigation';
import { TaskView } from '@/components/views/TaskView';
import { cancelTaskWithRefund, resolveDispute } from '@/lib/actions';
import { staffCan } from '@/lib/staff-roles';
import { getDisputeReasons, getMoneySettings, getTask, requireAdmin } from '@/lib/data';
import { isTaskHidden } from '@/lib/growth';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const [task, settings] = await Promise.all([getTask(id), getMoneySettings()]);
  if (!task) notFound();
  const dispute = task.status === 'DISPUTED' ? ((await getDisputeReasons([task.id])).get(task.id) ?? null) : null;
  const moderation = await isTaskHidden(task.id);
  return <TaskView t={task} settings={settings} now={new Date().toISOString()} resolveDispute={resolveDispute} dispute={dispute} moderation={moderation} cancelTask={staffCan(me.staffRole, 'money') ? cancelTaskWithRefund : undefined} />;
}
