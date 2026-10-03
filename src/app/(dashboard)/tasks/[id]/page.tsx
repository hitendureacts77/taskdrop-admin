import { notFound } from 'next/navigation';
import { TaskView } from '@/components/views/TaskView';
import { resolveDispute } from '@/lib/actions';
import { getMoneySettings, getTask, requireAdmin } from '@/lib/data';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [task, settings] = await Promise.all([getTask(id), getMoneySettings()]);
  if (!task) notFound();
  return <TaskView t={task} settings={settings} now={new Date().toISOString()} resolveDispute={resolveDispute} />;
}
