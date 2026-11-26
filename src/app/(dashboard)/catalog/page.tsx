import { CatalogView } from '@/components/views/CatalogView';
import { getCatalog } from '@/lib/catalog';
import { asFilter, asKind } from '@/lib/catalog-calc';
import { requireAdmin } from '@/lib/data';
import { staffCan } from '@/lib/staff-roles';

export const metadata = { title: 'Skills & categories' };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ kind?: string; f?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const kind = asKind(sp.kind);
  const rows = await getCatalog(kind);
  // Same access as changing a job's category: the people area. View-only roles get no buttons.
  return <CatalogView kind={kind} filter={asFilter(sp.f)} rows={rows} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
}
