import { SegmentsView } from '@/components/views/CrmViews';
import { getMembers, getSegments, getTags, parseCriteria } from '@/lib/crm';
import { requireAdmin } from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SegmentsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const criteria = parseCriteria(sp);
  const page = Math.max(0, Math.min(1000, Number(first(sp.page)) || 0));
  const pageSize = 30;
  const tags = await getTags();
  const [members, segments] = await Promise.all([getMembers(criteria, page, pageSize), getSegments(tags)]);
  return <SegmentsView d={{ criteria, tags, rows: members.rows, total: members.total, page, pageSize, segments, now: new Date().toISOString() }} />;
}
