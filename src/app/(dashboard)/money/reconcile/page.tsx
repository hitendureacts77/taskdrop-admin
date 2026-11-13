import { ReconcileView } from '@/components/views/AnalyticsViews';
import { requireSeeing } from '@/lib/data';
import { addIstDays, istDayKey, startOfIstDay } from '@/lib/days';
import { getReconcile } from '@/lib/growth';
import { mergeOpenProblems } from '@/lib/growth-calc';
import { getReconciliationRuns } from '@/lib/ops';
import { roleLabel } from '@/lib/staff-roles';

export default async function ReconcilePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const me = await requireSeeing('money');
  const raw = Number((await searchParams).days);
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  const to = istDayKey(startOfIstDay());
  const from = istDayKey(addIstDays(startOfIstDay(), -(days - 1)));
  // Still-open problems (a withdrawal waiting, a payment never credited) are listed whatever their date: the range only narrows closed history.
  const [windowRows, anyDate, runs] = await Promise.all([getReconcile(from, to), getReconcile('2020-01-01', to), getReconciliationRuns(20)]);
  const rows = anyDate.error || anyDate.setup ? windowRows : { ...windowRows, data: mergeOpenProblems(windowRows.data, anyDate.data) };
  const refusal = `Your staff role (${roleLabel(me.staffRole)}) can’t see this. Ask a full admin.`;
  return <ReconcileView days={days} rows={rows} from={from} to={to} runs={runs} refusal={refusal} />;
}
