import { SegmentsView } from '@/components/views/CrmViews';
import { parseOwnerFilter } from '@/lib/crm-calc';
import { getMembers, getSegments, getTags, parseCriteria } from '@/lib/crm';
import { requireAdmin } from '@/lib/data';
import { getStaffList } from '@/lib/growth';
import { staffCan } from '@/lib/staff-roles';

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SegmentsPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const criteria = parseCriteria(sp);
  const owner = parseOwnerFilter(sp.owner);
  const page = Math.max(0, Math.min(1000, Number(first(sp.page)) || 0));
  const pageSize = 30;
  const tags = await getTags();
  const [members, segments, staff] = await Promise.all([getMembers(criteria, page, pageSize, { filter: owner, me: me.id }), getSegments(tags), getStaffList()]);
  return (
    <SegmentsView
      d={{ criteria, tags, rows: members.rows, total: members.total, page, pageSize, segments, now: new Date().toISOString(), owner, staff, me: me.id, canEdit: staffCan(me.staffRole, 'people') }}
    />
  );
}
