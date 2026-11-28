import { ReportsQueueView } from '@/components/views/ModerationViews';
import { FlaggedV2, isTestReport } from '@/components/v2/safety/FlaggedV2';
import { requireAdmin } from '@/lib/data';
import { countOpenReports, getReports } from '@/lib/growth';
import { staffCan } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Reports queue' };

export default async function ReportsQueuePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireAdmin();
  const view = (await searchParams).view === 'done' ? 'done' : 'open';
  // View-only roles get no buttons; the moderation actions refuse them on the server anyway (B133).
  if (await getV2()) {
    const [reports, hide] = await Promise.all([getReports(view), getHideTestData()]);
    const shown = hide ? { ...reports, data: reports.data.filter((r) => !isTestReport(r)) } : reports;
    // The Open count agrees with the list: when test data is hidden it is the filtered list on the Open tab.
    const openCount = hide ? (view === 'open' ? shown.data.length : null) : await countOpenReports().catch(() => null);
    return <FlaggedV2 view={view} reports={shown} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} openCount={openCount} />;
  }
  return <ReportsQueueView view={view} reports={await getReports(view)} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
}
