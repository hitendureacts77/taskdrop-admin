import { PerformanceView } from '@/components/views/CrmGrowthViews';
import { addIstDays, istDayKey, startOfIstDay } from '@/lib/days';
import { requireAdmin } from '@/lib/data';
import { getStaffPerformance } from '@/lib/growth';

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const raw = Number((await searchParams).days);
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  const today = startOfIstDay();
  const from = addIstDays(today, -(days - 1));
  const to = addIstDays(today, 1);
  const rows = await getStaffPerformance(from.toISOString(), to.toISOString());
  return <PerformanceView rows={rows} days={days} from={from.toISOString()} to={istDayKey(addIstDays(to, -1))} />;
}
