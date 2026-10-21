import { AlertsView } from '@/components/views/AlertsView';
import { getAdminAlerts } from '@/lib/alerts';
import { requireAdmin } from '@/lib/data';

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireAdmin();
  const view = (await searchParams).view === 'all' ? 'all' : 'unread';
  return <AlertsView view={view} read={await getAdminAlerts(view)} now={new Date().toISOString()} />;
}
