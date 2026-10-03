import { UsersView } from '@/components/views/UsersView';
import { getUsers, parseUserFilter, requireAdmin } from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = parseUserFilter(sp.filter);
  const q = (first(sp.q) ?? '').slice(0, 80);
  const page = Math.max(0, Math.min(1000, Number(first(sp.page)) || 0));
  const pageSize = 30;
  const { rows, total } = await getUsers(filter, q, page, pageSize);
  return <UsersView d={{ now: new Date().toISOString(), filter, q, page, pageSize, rows, total }} />;
}
