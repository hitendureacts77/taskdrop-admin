import { AuditView } from '@/components/views/AdminConfigViews';
import { AUDIT_TABLES, getAuditLog } from '@/lib/admin-config';
import { asAuditScope } from '@/lib/audit-scope';
import { requireSeeing } from '@/lib/data';

export const metadata = { title: 'Audit log' };

const PAGE_SIZE = 40;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSeeing('settings');
  const sp = await searchParams;
  const t = typeof sp.table === 'string' && AUDIT_TABLES[sp.table] ? sp.table : null;
  const page = Math.max(0, Math.floor(Number(sp.page)) || 0);
  // Heartbeat lines are hidden unless asked for (B117).
  const scope = asAuditScope(sp.who);
  const { rows, total } = await getAuditLog(t, page, PAGE_SIZE, scope);
  return <AuditView rows={rows} total={total} table={t} page={page} pageSize={PAGE_SIZE} scope={scope} />;
}
