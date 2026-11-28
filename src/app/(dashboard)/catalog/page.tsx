import { CatalogView } from '@/components/views/CatalogView';
import { CatalogV2 } from '@/components/v2/catalog/CatalogV2';
import { getCatalog } from '@/lib/catalog';
import { asFilter, asKind } from '@/lib/catalog-calc';
import { requireAdmin } from '@/lib/data';
import { staffCan } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Skills & categories' };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ kind?: string; f?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const kind = asKind(sp.kind);
  // Same access as changing a job's category: the people area. View-only roles get no buttons.
  const canAct = staffCan(me.staffRole, 'people');
  if (await getV2()) {
    // v2: both kinds are read so each tab shows its count.
    const [rows, other, hideTest] = await Promise.all([getCatalog(kind), getCatalog(kind === 'skill' ? 'category' : 'skill'), getHideTestData()]);
    return <CatalogV2 kind={kind} filter={asFilter(sp.f)} rows={rows} other={other} now={new Date().toISOString()} canAct={canAct} hideTest={hideTest} />;
  }
  const rows = await getCatalog(kind);
  return <CatalogView kind={kind} filter={asFilter(sp.f)} rows={rows} now={new Date().toISOString()} canAct={canAct} />;
}
