import { ReportsQueueView } from '@/components/views/ModerationViews';
import { requireAdmin } from '@/lib/data';
import { getReports } from '@/lib/growth';
import { staffCan } from '@/lib/staff-roles';

export const metadata = { title: 'Reports queue' };

export default async function ReportsQueuePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireAdmin();
  const view = (await searchParams).view === 'done' ? 'done' : 'open';
  // View-only roles get no buttons; the moderation actions refuse them on the server anyway (B133).
  return <ReportsQueueView view={view} reports={await getReports(view)} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
}
