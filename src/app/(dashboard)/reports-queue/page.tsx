import { ReportsQueueView } from '@/components/views/ModerationViews';
import { requireAdmin } from '@/lib/data';
import { getReports } from '@/lib/growth';

export default async function ReportsQueuePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireAdmin();
  const view = (await searchParams).view === 'done' ? 'done' : 'open';
  return <ReportsQueueView view={view} reports={await getReports(view)} now={new Date().toISOString()} />;
}
