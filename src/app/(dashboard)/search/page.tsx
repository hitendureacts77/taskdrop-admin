import { SearchPageV2 } from '@/components/v2/search/SearchPageV2';
import { SearchView } from '@/components/views/MoreViews';
import { getTasks, getUsers, requireAdmin } from '@/lib/data';
import { staffCanSee } from '@/lib/staff-roles';
import { searchEverything } from '@/lib/v2/search-data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Search' };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? '').trim().slice(0, 80);
  if (await getV2()) {
    const money = staffCanSee(me.staffRole, 'money');
    const found = q ? await searchEverything(q, { limit: 10, money, hide: await getHideTestData() }) : null;
    return <SearchPageV2 q={q} found={found} money={money} />;
  }
  const [tasks, people] = q ? await Promise.all([getTasks('all', q, 0, 10), getUsers('all', q, 0, 10)]) : [null, null];
  return <SearchView q={q} tasks={tasks?.rows ?? []} people={(people?.rows ?? []).map((p) => (staffCanSee(me.staffRole, 'money') ? p : { ...p, walletMinor: 0, clearingMinor: 0 }))} hideMoney={!staffCanSee(me.staffRole, 'money')} />;
}
