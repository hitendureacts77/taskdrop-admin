import { AuditView } from '@/components/views/AdminConfigViews';
import { AuditV2 } from '@/components/v2/settings-tools/AuditV2';
import { AUDIT_TABLES, getAuditLog } from '@/lib/admin-config';
import { asAuditArea, getAuditLogV2 } from '@/lib/audit-log-v2';
import { asAuditScope } from '@/lib/audit-scope';
import { cleanSearch } from '@/lib/audit-words';
import { requireSeeing } from '@/lib/data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Audit log' };

const PAGE_SIZE = 40;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireSeeing('settings');
  const sp = await searchParams;
  const page = Math.max(0, Math.floor(Number(sp.page)) || 0);
  // Heartbeat lines are hidden unless asked for (B117).
  const scope = asAuditScope(sp.who);
  if (await getV2()) {
    const table = asAuditArea(sp.table);
    const q = cleanSearch(sp.q);
    const { rows, total } = await getAuditLogV2({ table, page, pageSize: PAGE_SIZE, scope, q, hideTest: await getHideTestData() });
    return <AuditV2 rows={rows} total={total} table={table} page={page} pageSize={PAGE_SIZE} scope={scope} q={q} role={me.staffRole} now={new Date().toISOString()} />;
  }
  const t = typeof sp.table === 'string' && AUDIT_TABLES[sp.table] ? sp.table : null;
  const { rows, total } = await getAuditLog(t, page, PAGE_SIZE, scope);
  return <AuditView rows={rows} total={total} table={t} page={page} pageSize={PAGE_SIZE} scope={scope} />;
}
