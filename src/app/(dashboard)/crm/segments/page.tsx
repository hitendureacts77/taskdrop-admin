import { SegmentsView } from '@/components/views/CrmViews';
import { SegmentsV2 } from '@/components/v2/crm/Segments';
import { parseOwnerFilter } from '@/lib/crm-calc';
import { getMembers, getSegments, getTags, parseCriteria } from '@/lib/crm';
import { requireAdmin } from '@/lib/data';
import { getStaffList } from '@/lib/growth';
import { staffCan, staffCanSee } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Segments' };

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SegmentsPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const hideMoney = !staffCanSee(me.staffRole, 'money');
  const parsedCriteria = parseCriteria(sp);
  // A wallet filter would reveal who holds money, so Sales cannot use one, even by typing it in the address.
  const criteria = hideMoney ? { ...parsedCriteria, min_wallet_minor: undefined } : parsedCriteria;
  const owner = parseOwnerFilter(sp.owner);
  const page = Math.max(0, Math.min(1000, Number(first(sp.page)) || 0));
  const pageSize = 30;
  const v2on = await getV2();
  // Admin v2 "Hide test data": test accounts leave the list, its count, the saved-segment counts and the tag counts together.
  const hideTest = v2on ? await getHideTestData() : false;
  const testOpts = hideTest ? { hideTest: true } : undefined;
  // getSegments needs the tag list; the members and the staff list do not, so none of them waits for the others.
  const tagsRead = getTags(testOpts);
  const [fetched, tags, segments, staff] = await Promise.all([
    getMembers(criteria, page, pageSize, { filter: owner, me: me.id }, testOpts),
    tagsRead,
    tagsRead.then((t) => getSegments(t, testOpts)),
    getStaffList(),
  ]);
  // Saved segments that filter on the wallet are hidden from Sales too: their name and head count would say who holds money (S7-26).
  const shownSegments = hideMoney ? segments.filter((x) => !x.criteria.min_wallet_minor) : segments;
  const members = hideMoney ? { ...fetched, rows: fetched.rows.map((r) => ({ ...r, walletMinor: 0, clearingMinor: 0 })) } : fetched;
  const canEdit = staffCan(me.staffRole, 'people');
  if (v2on) {
    return (
      <SegmentsV2
        d={{ hideMoney, hideTest, criteria, tags, rows: members.rows, total: members.total, page, pageSize, segments: shownSegments, now: new Date().toISOString(), owner, staff, me: me.id, canEdit }}
      />
    );
  }
  return (
    <SegmentsView
      d={{ hideMoney, criteria, tags, rows: members.rows, total: members.total, page, pageSize, segments: shownSegments, now: new Date().toISOString(), owner, staff, me: me.id, canEdit }}
    />
  );
}
