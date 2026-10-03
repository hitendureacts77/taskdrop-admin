import { SearchView } from '@/components/views/MoreViews';
import { getTasks, getUsers, requireAdmin } from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? '').trim().slice(0, 80);
  const [tasks, people] = q ? await Promise.all([getTasks('all', q, 0, 10), getUsers('all', q, 0, 10)]) : [null, null];
  return <SearchView q={q} tasks={tasks?.rows ?? []} people={people?.rows ?? []} />;
}
