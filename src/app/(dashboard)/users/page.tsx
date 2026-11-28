import { redirect } from 'next/navigation';
import { PeopleList } from '@/components/v2/people/PeopleList';
import { UsersView, type UsersData } from '@/components/views/UsersView';
import { staffSeesContacts } from '@/lib/contact-mask';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';
import { getSuspendedAmong, getTags, getTagsFor, idsSuspended, idsWithTag } from '@/lib/crm';
import { lastPageIndex } from '@/lib/data/paging';
import { getUsers, parseUserFilter, requireAdmin } from '@/lib/data';
import { staffCanSee } from '@/lib/staff-roles';
import { isUuid } from '@/lib/data';

export const metadata = { title: 'People' };

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const hideMoney = !staffCanSee(me.staffRole, 'money');
  const sp = await searchParams;
  // "Money in wallet" is a view of company money: Sales gets everyone instead.
  const parsed = parseUserFilter(sp.filter);
  const filter = hideMoney && parsed === 'money' ? 'all' : parsed;
  const q = (first(sp.q) ?? '').slice(0, 80);
  const page = Math.max(0, Math.min(1000, Number(first(sp.page)) || 0));
  const tag = first(sp.tag) && isUuid(first(sp.tag)!) ? first(sp.tag)! : '';
  const pageSize = 30;
  // Admin v2 only (both false with the gate off): the new look, and the account menu's Hide test data.
  const [v2, hideTest] = await Promise.all([getV2(), getHideTestData()]);

  // The CRM filters (a tag, the suspended) are worked out into lists of people first.
  // (The tag list does not depend on them, so it is read meanwhile.)
  const [suspendedIds, tagged, allTags] = await Promise.all([filter === 'suspended' ? idsSuspended() : null, tag ? idsWithTag(tag) : null, getTags()]);
  let restrict: string[] | null = suspendedIds;
  if (tagged) restrict = restrict ? restrict.filter((id) => tagged.includes(id)) : tagged;

  const { rows: fetched, total } = await getUsers(filter, q, page, pageSize, restrict, hideTest);
  // A page after the last one (a typed address, or a list that shrank): go to the last real page.
  if (!fetched.length && total > 0 && page > lastPageIndex(total, pageSize)) {
    const back = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== 'page' && typeof first(v) === 'string') back.set(k, first(v)!);
    const last = lastPageIndex(total, pageSize);
    if (last > 0) back.set('page', String(last));
    redirect(`/users${back.size ? `?${back}` : ''}`);
  }
  const rows = hideMoney ? fetched.map((r) => ({ ...r, walletMinor: 0, clearingMinor: 0 })) : fetched;
  const ids = rows.map((r) => r.id);
  const [tagsByUser, suspended] = await Promise.all([getTagsFor(ids), getSuspendedAmong(ids)]);

  const d: UsersData = {
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
    hideMoney,
  };
  if (v2) return <PeopleList d={d} hideTest={hideTest} contactsInExport={staffSeesContacts(me.staffRole)} />;
  return <UsersView d={d} />;
}
