import { notFound } from 'next/navigation';
import { AuditTab, DevicesTab, FollowUpsTab, MoneyTab, parseUserTab } from '@/components/views/UserTabs';
import { UserView } from '@/components/views/UserView';
import { getPersonCrm, getTimeline } from '@/lib/crm';
import { getMoneySettings, getUser, requireAdmin } from '@/lib/data';
import { staffCanSee } from '@/lib/staff-roles';
import { getUserFollowUps } from '@/lib/growth';
import { getUserAudit, getUserDevices, getUserPayments, getUserSignIn } from '@/lib/user360';

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const hideMoney = !staffCanSee(me.staffRole, 'money');
  // Sales never gets the Money tab, even by typing the address.
  const tab = parseUserTab((await searchParams).tab);
  const [fetched, settings] = await Promise.all([getUser(id), getMoneySettings()]);
  if (!fetched) notFound();
  // Their wallet, corrections, withdrawals and what posters paid are emptied here, before anything is drawn.
  const user = hideMoney
    ? { ...fetched, walletMinor: 0, clearingMinor: 0, adjustments: [], payouts: [], worked: fetched.worked.map((t) => ({ ...t, escrowMinor: 0 })) }
    : fetched;
  // Only the open tab reads its extra data, and it is read together with the rest of the page.
  const [crm, timeline, payments, followUps, devices, audit] = await Promise.all([
    getPersonCrm(id),
    getTimeline(id, user.joinedAt, { hideMoney }),
    tab === 'money' && !hideMoney ? getUserPayments(id) : null,
    tab === 'followups' ? getUserFollowUps(id) : null,
    tab === 'devices' ? Promise.all([getUserDevices(id), getUserSignIn(id, Boolean(user.username))]) : null,
    tab === 'audit' ? getUserAudit(id) : null,
  ]);
  const now = new Date();

  let extra = null;
  if (payments) extra = <MoneyTab u={user} payments={payments} />;
  // getPersonCrm already read the staff list.
  else if (followUps) extra = <FollowUpsTab userId={id} items={followUps} staff={crm.staff} me={me.id} />;
  else if (devices) extra = <DevicesTab devices={devices[0]} now={now} signIn={devices[1]} userId={id} name={user.name} canSignOut={id !== me.id} />;
  else if (audit) extra = <AuditTab entries={audit} />;

  return <UserView u={user} settings={settings} now={now.toISOString()} crm={crm} timeline={timeline} tab={hideMoney && tab === 'money' ? 'overview' : tab} extra={extra} hideMoney={hideMoney} />;
}
