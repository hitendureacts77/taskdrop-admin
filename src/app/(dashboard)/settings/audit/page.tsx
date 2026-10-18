import { AuditView } from '@/components/views/AdminConfigViews';
import { AUDIT_TABLES, getAuditLog } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';

const PAGE_SIZE = 40;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSeeing('settings');
  const sp = await searchParams;
  const t = typeof sp.table === 'string' && AUDIT_TABLES[sp.table] ? sp.table : null;
  const page = Math.max(0, Math.floor(Number(sp.page)) || 0);
  const { rows, total } = await getAuditLog(t, page, PAGE_SIZE);
  return <AuditView rows={rows} total={total} table={t} page={page} pageSize={PAGE_SIZE} />;
}
