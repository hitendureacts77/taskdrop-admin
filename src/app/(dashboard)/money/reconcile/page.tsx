import { ReconcileView } from '@/components/views/AnalyticsViews';
import { requireSeeing } from '@/lib/data';
import { addIstDays, istDayKey, startOfIstDay } from '@/lib/days';
import { getReconcile } from '@/lib/growth';
import { mergeOpenProblems } from '@/lib/growth-calc';
import { getReconciliationRuns } from '@/lib/ops';
import { roleLabel } from '@/lib/staff-roles';

/** The longest range admin_reconcile accepts (it refuses `p_to - p_from > 400`). */
const RECONCILE_MAX_DAYS = 400;

export default async function ReconcilePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const me = await requireSeeing('money');
  const raw = Number((await searchParams).days);
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  const to = istDayKey(startOfIstDay());
  const from = istDayKey(addIstDays(startOfIstDay(), -(days - 1)));
  // Still-open problems (a withdrawal waiting, a payment never credited) are listed whatever their date: the range only narrows closed history.
  // admin_reconcile refuses more than 400 days at a time, so "any date" is the widest range it accepts (B113 recheck:
  // a range from 2020 was refused and the page silently fell back to the window).
  const openFrom = istDayKey(addIstDays(startOfIstDay(), -RECONCILE_MAX_DAYS));
  const [windowRows, anyDate, runs] = await Promise.all([getReconcile(from, to), getReconcile(openFrom, to), getReconciliationRuns(20)]);
  const rows = anyDate.error || anyDate.setup ? windowRows : { ...windowRows, data: mergeOpenProblems(windowRows.data, anyDate.data) };
  const refusal = `Your staff role (${roleLabel(me.staffRole)}) can’t see this. Ask a full admin.`;
  return <ReconcileView days={days} rows={rows} from={from} to={to} runs={runs} refusal={refusal} />;
}
