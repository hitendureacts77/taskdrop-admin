import { ReconcileView } from '@/components/views/AnalyticsViews';
import { requireSeeing } from '@/lib/data';
import { getMoneyCheckRows } from '@/lib/growth';
import { getReconciliationRuns } from '@/lib/ops';
import { roleLabel } from '@/lib/staff-roles';

export default async function ReconcilePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const me = await requireSeeing('money');
  const raw = Number((await searchParams).days);
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  // Still-open problems (a withdrawal waiting, a payment never credited) are listed whatever their date: the range only narrows closed history.
  const [{ read: rows, from, to }, runs] = await Promise.all([getMoneyCheckRows(days), getReconciliationRuns(20)]);
  const refusal = `Your staff role (${roleLabel(me.staffRole)}) can’t see this. Ask a full admin.`;
  return <ReconcileView days={days} rows={rows} from={from} to={to} runs={runs} refusal={refusal} />;
}
