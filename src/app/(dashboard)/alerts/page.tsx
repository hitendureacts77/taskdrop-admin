import { AlertsView } from '@/components/views/AlertsView';
import { AlertsV2 } from '@/components/v2/safety/AlertsV2';
import { getAdminAlerts, getAdminAlertsV2 } from '@/lib/alerts';
import { requireAdmin } from '@/lib/data';
import { staffCanMarkAlerts, staffCanSee } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Alerts' };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireAdmin();
  const view = (await searchParams).view === 'all' ? 'all' : 'unread';
  if (await getV2()) {
    const seesMoney = staffCanSee(me.staffRole, 'money');
    const read = await getAdminAlertsV2(view, { seesMoney, hideTest: await getHideTestData() });
    return <AlertsV2 view={view} read={read} now={new Date().toISOString()} canMark={staffCanMarkAlerts(me.staffRole)} seesMoney={seesMoney} />;
  }
  return <AlertsView view={view} read={await getAdminAlerts(view)} now={new Date().toISOString()} canMark={staffCanMarkAlerts(me.staffRole)} />;
}
