import { ReconcileView } from '@/components/views/AnalyticsViews';
import { requireAdmin } from '@/lib/data';
import { addIstDays, istDayKey, startOfIstDay } from '@/lib/days';
import { getReconcile } from '@/lib/growth';

export default async function ReconcilePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const raw = Number((await searchParams).days);
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  const to = istDayKey(startOfIstDay());
  const from = istDayKey(addIstDays(startOfIstDay(), -(days - 1)));
  return <ReconcileView days={days} rows={await getReconcile(from, to)} from={from} to={to} />;
}
