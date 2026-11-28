import { notFound } from 'next/navigation';
import { TaskView } from '@/components/views/TaskView';
import { TaskPageV2 } from '@/components/v2/jobs/TaskPageV2';
import { cancelTaskWithRefund, resolveDispute } from '@/lib/actions';
import { decideDisputeV2 } from '@/lib/v2/jobs-actions';
import { staffCan, staffCanSee } from '@/lib/staff-roles';
import { getDisputeReasons, getMoneySettings, getTask, requireAdmin } from '@/lib/data';
import { getTaskHold } from '@/lib/data/tasks';
import { isTaskHidden } from '@/lib/growth';
import { getTaskPhotos } from '@/lib/photos';
import { getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Job' };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const hideMoney = !staffCanSee(me.staffRole, 'money');
  const [fetched, settings, v2] = await Promise.all([getTask(id), getMoneySettings(), getV2()]);
  if (!fetched) notFound();
  // What TaskDrop earns from the job and the card payment are emptied before anything is drawn.
  const task = hideMoney ? { ...fetched, ledger: [], payment: null } : fetched;
  // Three independent reads, made together.
  // Pictures are a nicety: if they cannot be read (no service key, ImageKit down) the job page still opens.
  const [disputes, moderation, photos, hold] = await Promise.all([
    task.status === 'DISPUTED' ? getDisputeReasons([task.id]) : null,
    isTaskHidden(task.id),
    getTaskPhotos(task.id).catch(() => null),
    // v2 only, and never for a role that may not see money (Sales).
    v2 && !hideMoney ? getTaskHold(task.id).catch(() => null) : null,
  ]);
  const dispute = disputes?.get(task.id) ?? null;
  const canMoney = staffCan(me.staffRole, 'money');
  if (v2) {
    return (
      <TaskPageV2
        t={task}
        settings={settings}
        now={new Date().toISOString()}
        hold={hold}
        dispute={dispute}
        moderation={moderation}
        photos={photos}
        hideMoney={hideMoney}
        canMoney={canMoney}
        decide={decideDisputeV2}
        cancelTask={canMoney ? cancelTaskWithRefund : undefined}
      />
    );
  }
  return <TaskView t={task} settings={settings} now={new Date().toISOString()} resolveDispute={resolveDispute} dispute={dispute} moderation={moderation} cancelTask={canMoney ? cancelTaskWithRefund : undefined} hideMoney={hideMoney} photos={photos} />;
}
