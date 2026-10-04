import { MessagesView } from '@/components/views/CrmViews';
import { criteriaToQuery, getAudiences, getBroadcasts, hasFilters, parseCriteria } from '@/lib/crm';
import { requireAdmin } from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MessagesPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  // Arriving from the Segments page with filters in the address means "message exactly these people".
  const fromFilters = parseCriteria(sp);
  const filtered = hasFilters(fromFilters);
  const [audiences, history] = await Promise.all([getAudiences(filtered ? fromFilters : undefined), getBroadcasts(30)]);
  const wanted = first(sp.audience);
  const defaultAudience = filtered ? 'filters' : wanted && audiences.some((a) => a.key === wanted) ? wanted : 'all';
  return <MessagesView d={{ audiences, defaultAudience, filtersQuery: filtered ? criteriaToQuery(fromFilters) : '', history, now: new Date().toISOString() }} />;
}
