import { notFound } from 'next/navigation';
import { PersonPage } from '@/components/v2/people/PersonPage';
import { AuditTab, DevicesTab, FollowUpsTab, MoneyTab, parseUserTab } from '@/components/views/UserTabs';
import { UserView } from '@/components/views/UserView';
import { getPersonCrm, getTimeline } from '@/lib/crm';
import { getMoneySettings, getUser, isUuid, requireAdmin } from '@/lib/data';
import { logContactView } from '@/lib/contact-audit';
import { staffSeesContacts } from '@/lib/contact-mask';
import { staffCanSee } from '@/lib/staff-roles';
import { getUserFollowUps } from '@/lib/growth';
import { getUserAudit, getUserDevices, getUserPayments, getUserSignIn, getUserWarnings } from '@/lib/user360';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Person' };

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const hideMoney = !staffCanSee(me.staffRole, 'money');
  // Sales never gets the Money tab, even by typing the address.
  const tab = parseUserTab((await searchParams).tab);
  // Full phone and email only for Admin and Support, only on the overview (the one tab that shows them), and only once
  // the open is on record. If the audit row cannot be written the page still opens, with masked contacts.
  const contacts: 'full' | 'masked' =
    tab === 'overview' && staffSeesContacts(me.staffRole) && isUuid(id) && (await logContactView(id)) ? 'full' : 'masked';
  const [fetched, settings, v2, hideTest] = await Promise.all([getUser(id, contacts), getMoneySettings(), getV2(), getHideTestData()]);
  if (!fetched) notFound();
  // Their wallet, corrections, withdrawals and what posters paid are emptied here, before anything is drawn.
  const user = hideMoney
    ? { ...fetched, walletMinor: 0, clearingMinor: 0, adjustments: [], payouts: [], worked: fetched.worked.map((t) => ({ ...t, escrowMinor: 0 })) }
    : fetched;
  // Only the open tab reads its extra data, and it is read together with the rest of the page.
  // Admin v2 also shows past warnings on the overview (gate off: not read).
  const [crm, timeline, payments, followUps, devices, audit, warnings] = await Promise.all([
    getPersonCrm(id),
    getTimeline(id, user.joinedAt, { hideMoney }),
    tab === 'money' && !hideMoney ? getUserPayments(id) : null,
    tab === 'followups' ? getUserFollowUps(id) : null,
    tab === 'devices' ? Promise.all([getUserDevices(id), getUserSignIn(id, Boolean(user.username))]) : null,
    tab === 'audit' ? getUserAudit(id) : null,
    v2 && tab === 'overview' ? getUserWarnings(id) : null,
  ]);
  const now = new Date();
  const shownTab = hideMoney && tab === 'money' ? 'overview' : tab;

  if (v2) {
    return (
      <PersonPage
        u={user}
        settings={settings}
        now={now.toISOString()}
        crm={crm}
        timeline={timeline}
        tab={shownTab}
        hideMoney={hideMoney}
        hideTest={hideTest}
        warnings={warnings ?? { setup: false, rows: [] }}
        data={{
          payments: tab === 'money' && !hideMoney ? payments : undefined,
          followUps: followUps ? { items: followUps, me: me.id } : undefined,
          devices: devices ? { list: devices[0], signIn: devices[1], canSignOut: id !== me.id } : undefined,
          audit: audit ?? undefined,
        }}
      />
    );
  }

  let extra = null;
  if (payments) extra = <MoneyTab u={user} payments={payments} />;
  // getPersonCrm already read the staff list.
  else if (followUps) extra = <FollowUpsTab userId={id} items={followUps} staff={crm.staff} me={me.id} />;
  else if (devices) extra = <DevicesTab devices={devices[0]} now={now} signIn={devices[1]} userId={id} name={user.name} canSignOut={id !== me.id} />;
  else if (audit) extra = <AuditTab entries={audit} />;

  return <UserView u={user} settings={settings} now={now.toISOString()} crm={crm} timeline={timeline} tab={shownTab} extra={extra} hideMoney={hideMoney} />;
}
