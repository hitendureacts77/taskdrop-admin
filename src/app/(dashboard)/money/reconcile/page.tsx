import { ReconcileView } from '@/components/views/AnalyticsViews';
import { ReconcileV2 } from '@/components/v2/money/ReconcileV2';
import { getMoneyCheckNotes, requireSeeing } from '@/lib/data';
import { getMoneyCheckRows } from '@/lib/growth';
import { getReconciliationRuns } from '@/lib/ops';
import { roleLabel } from '@/lib/staff-roles';
import { isTestRow } from '@/lib/test-data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Money check' };

export default async function ReconcilePage({ searchParams }: { searchParams: Promise<{ days?: string; kind?: string }> }) {
  const me = await requireSeeing('money');
  const sp = await searchParams;
  const raw = Number(sp.days);
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  // Still-open problems (a withdrawal waiting, a payment never credited) are listed whatever their date: the range only narrows closed history.
  const [{ read: rows, from, to }, runs, v2] = await Promise.all([getMoneyCheckRows(days), getReconciliationRuns(20), getV2()]);
  const refusal = `Your staff role (${roleLabel(me.staffRole)}) can’t see this. Ask a full admin.`;
  if (!v2) return <ReconcileView days={days} rows={rows} from={from} to={to} runs={runs} refusal={refusal} />;

  const [notes, hide] = await Promise.all([getMoneyCheckNotes(), getHideTestData()]);
  const kept = hide ? rows.data.filter((r) => !isTestRow({ id: r.refId, title: r.subject ?? null })) : rows.data;
  const kind = typeof sp.kind === 'string' && /^[a-z_]{1,60}$/.test(sp.kind) ? sp.kind : 'all';
  return (
    <ReconcileV2
      days={days}
      kind={kind}
      rows={{ ...rows, data: kept }}
      from={from}
      to={to}
      runs={runs}
      notes={notes}
      refusal={refusal}
      hidden={rows.data.length - kept.length}
    />
  );
}
