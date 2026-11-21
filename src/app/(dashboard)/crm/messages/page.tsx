import { MessagesView } from '@/components/views/CrmViews';
import { criteriaToQuery, getAudiences, getBroadcasts, hasFilters, parseCriteria } from '@/lib/crm';
import { requireAdmin } from '@/lib/data';
import { withoutWallet } from '@/lib/crm-calc';
import { staffCanSee } from '@/lib/staff-roles';

export const metadata = { title: 'Messages' };

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MessagesPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const hideMoney = !staffCanSee(me.staffRole, 'money');
  const sp = await searchParams;
  // Arriving from the Segments page with filters in the address means "message exactly these people".
  const parsed = parseCriteria(sp);
  // A wallet filter would reveal who holds money, so Sales cannot use one, even by typing it in the address (S7-26).
  const fromFilters = hideMoney ? withoutWallet(parsed) : parsed;
  const filtered = hasFilters(fromFilters);
  const [audiences, history] = await Promise.all([getAudiences(filtered ? fromFilters : undefined, { hideMoney }), getBroadcasts(30)]);
  const wanted = first(sp.audience);
  const defaultAudience = filtered ? 'filters' : wanted && audiences.some((a) => a.key === wanted) ? wanted : 'all';
  return <MessagesView d={{ audiences, defaultAudience, filtersQuery: filtered ? criteriaToQuery(fromFilters) : '', history, now: new Date().toISOString() }} />;
}
