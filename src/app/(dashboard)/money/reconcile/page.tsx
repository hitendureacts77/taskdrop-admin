import { ReconcileView } from '@/components/views/AnalyticsViews';
import { requireSeeing } from '@/lib/data';
import { addIstDays, istDayKey, startOfIstDay } from '@/lib/days';
import { getReconcile } from '@/lib/growth';
import { getReconciliationRuns } from '@/lib/ops';
import { roleLabel } from '@/lib/staff-roles';

export default async function ReconcilePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const me = await requireSeeing('money');
  const raw = Number((await searchParams).days);
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  const to = istDayKey(startOfIstDay());
  const from = istDayKey(addIstDays(startOfIstDay(), -(days - 1)));
  const [rows, runs] = await Promise.all([getReconcile(from, to), getReconciliationRuns(20)]);
  const refusal = `Your staff role (${roleLabel(me.staffRole)}) can’t see this. Ask a full admin.`;
  return <ReconcileView days={days} rows={rows} from={from} to={to} runs={runs} refusal={refusal} />;
}
