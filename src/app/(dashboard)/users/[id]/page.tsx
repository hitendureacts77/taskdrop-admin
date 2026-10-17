import { notFound } from 'next/navigation';
import { AuditTab, DevicesTab, FollowUpsTab, MoneyTab, parseUserTab } from '@/components/views/UserTabs';
import { UserView } from '@/components/views/UserView';
import { getPersonCrm, getTimeline } from '@/lib/crm';
import { getMoneySettings, getUser, requireAdmin } from '@/lib/data';
import { getStaffList, getUserFollowUps } from '@/lib/growth';
import { getUserAudit, getUserDevices, getUserPayments } from '@/lib/user360';

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const tab = parseUserTab((await searchParams).tab);
  const [user, settings] = await Promise.all([getUser(id), getMoneySettings()]);
  if (!user) notFound();
  const [crm, timeline] = await Promise.all([getPersonCrm(id), getTimeline(id, user.joinedAt)]);
  const now = new Date();

  // Only the open tab reads its extra data.
  let extra = null;
  if (tab === 'money') extra = <MoneyTab u={user} payments={await getUserPayments(id)} />;
  else if (tab === 'followups') extra = <FollowUpsTab userId={id} items={await getUserFollowUps(id)} staff={await getStaffList()} me={me.id} />;
  else if (tab === 'devices') extra = <DevicesTab devices={await getUserDevices(id)} now={now} />;
  else if (tab === 'audit') extra = <AuditTab entries={await getUserAudit(id)} />;

  return <UserView u={user} settings={settings} now={now.toISOString()} crm={crm} timeline={timeline} tab={tab} extra={extra} />;
}
