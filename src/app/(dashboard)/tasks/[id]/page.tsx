import { notFound } from 'next/navigation';
import { TaskView } from '@/components/views/TaskView';
import { cancelTaskWithRefund, resolveDispute } from '@/lib/actions';
import { staffCan, staffCanSee } from '@/lib/staff-roles';
import { getDisputeReasons, getMoneySettings, getTask, requireAdmin } from '@/lib/data';
import { isTaskHidden } from '@/lib/growth';
import { getTaskPhotos } from '@/lib/photos';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const hideMoney = !staffCanSee(me.staffRole, 'money');
  const [fetched, settings] = await Promise.all([getTask(id), getMoneySettings()]);
  if (!fetched) notFound();
  // What TaskDrop earns from the job and the card payment are emptied before anything is drawn.
  const task = hideMoney ? { ...fetched, ledger: [], payment: null } : fetched;
  const dispute = task.status === 'DISPUTED' ? ((await getDisputeReasons([task.id])).get(task.id) ?? null) : null;
  const moderation = await isTaskHidden(task.id);
  // Pictures are a nicety: if they cannot be read (no service key, ImageKit down) the job page still opens.
  const photos = await getTaskPhotos(task.id).catch(() => null);
  return <TaskView t={task} settings={settings} now={new Date().toISOString()} resolveDispute={resolveDispute} dispute={dispute} moderation={moderation} cancelTask={staffCan(me.staffRole, 'money') ? cancelTaskWithRefund : undefined} hideMoney={hideMoney} photos={photos} />;
}
