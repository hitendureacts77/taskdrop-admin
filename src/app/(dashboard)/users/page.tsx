import { UsersView } from '@/components/views/UsersView';
import { getSuspendedAmong, getTags, getTagsFor, idsSuspended, idsWithTag } from '@/lib/crm';
import { getUsers, parseUserFilter, requireAdmin } from '@/lib/data';
import { isUuid } from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = parseUserFilter(sp.filter);
  const q = (first(sp.q) ?? '').slice(0, 80);
  const page = Math.max(0, Math.min(1000, Number(first(sp.page)) || 0));
  const tag = first(sp.tag) && isUuid(first(sp.tag)!) ? first(sp.tag)! : '';
  const pageSize = 30;

  // The CRM filters (a tag, the suspended) are worked out into lists of people first.
  let restrict: string[] | null = null;
  if (filter === 'suspended') restrict = await idsSuspended();
  if (tag) {
    const tagged = await idsWithTag(tag);
    restrict = restrict ? restrict.filter((id) => tagged.includes(id)) : tagged;
  }

  const [{ rows, total }, allTags] = await Promise.all([getUsers(filter, q, page, pageSize, restrict), getTags()]);
  const ids = rows.map((r) => r.id);
  const [tagsByUser, suspended] = await Promise.all([getTagsFor(ids), getSuspendedAmong(ids)]);

  return (
    <UsersView
      d={{
        now: new Date().toISOString(),
        filter,
        q,
        page,
        pageSize,
        rows,
        total,
        tag,
        allTags,
        tagsByUser: Object.fromEntries(tagsByUser),
        suspended: Object.fromEntries([...suspended].map(([id, s]) => [id, s.reason])),
      }}
    />
  );
}
