import { TasksView } from '@/components/views/TasksView';
import { getEscrowJobs, getTasks, parseTaskFilter, requireAdmin } from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TasksPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = parseTaskFilter(sp.filter);
  const q = (first(sp.q) ?? '').slice(0, 80);
  const page = Math.max(0, Math.min(1000, Number(first(sp.page)) || 0));
  const pageSize = 30;
  const [{ rows, total }, escrow] = await Promise.all([getTasks(filter, q, page, pageSize), filter === 'escrow' ? getEscrowJobs() : null]);
  const heldTotal = escrow ? escrow.filter((j) => j.funded).reduce((a, j) => a + j.escrowMinor, 0) : null;
  return <TasksView d={{ now: new Date().toISOString(), filter, q, page, pageSize, rows, total, heldTotal }} />;
}
