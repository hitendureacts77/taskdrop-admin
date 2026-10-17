import type { UserAuditEntry, UserDevice, UserPayment } from '@/lib/user360';
import type { UserDetail } from '@/lib/data';
import { istDateTime, timeAgo } from '@/lib/format';
import type { Tone } from '@/lib/labels';
import type { FollowUp, Read } from '@/lib/growth';
import { FinishButton, FollowUpForm } from '../GrowthForms';
import { Card, Empty, JobLink, Money, Pill } from '../ui';
import { SetupNotice } from './SetupNotice';

export const USER_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'money', label: 'Money' },
  { key: 'followups', label: 'Follow-ups' },
  { key: 'devices', label: 'Devices' },
  { key: 'audit', label: 'Audit' },
] as const;
export type UserTab = (typeof USER_TABS)[number]['key'];

export function parseUserTab(v: string | undefined): UserTab {
  return USER_TABS.find((t) => t.key === v)?.key ?? 'overview';
}

const NEEDS_KEY = <p className="muted small">This needs SUPABASE_SERVICE_ROLE_KEY on the server, so it is hidden here.</p>;

function paymentStatus(status: string): { label: string; tone: Tone } {
  if (status === 'paid') return { label: 'Paid', tone: 'green' };
  if (status === 'failed') return { label: 'Failed', tone: 'red' };
  if (status === 'cancelled') return { label: 'Cancelled', tone: 'grey' };
  return { label: 'Waiting', tone: 'gold' };
}

/** Everything about this person's money in one place: totals, what they paid in, and what they took out. */
export function MoneyTab({ u, payments }: { u: UserDetail; payments: UserPayment[] | null }) {
  const first = u.name.split(' ')[0] ?? u.name;
  const paid = (payments ?? []).filter((p) => p.status === 'paid');
  const paidIn = paid.reduce((s, p) => s + p.amountMinor, 0);
  const withdrawn = u.payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount_minor, 0);
  return (
    <div className="stack">
      <Card title={`${first}’s money at a glance`} sub="All amounts are in rupees.">
        <div className="figures">
          <div className="figure">
            <span className="figure-label">Ready to withdraw</span>
            <Money minor={u.walletMinor} className="figure-num" />
          </div>
          <div className="figure">
            <span className="figure-label">Still clearing</span>
            <Money minor={u.clearingMinor} className="figure-num" />
          </div>
          <div className="figure">
            <span className="figure-label">Paid in (shown payments)</span>
            {payments ? <Money minor={paidIn} className="figure-num" /> : <span className="muted">Hidden</span>}
          </div>
          <div className="figure">
            <span className="figure-label">Withdrawn (shown withdrawals)</span>
            <Money minor={withdrawn} className="figure-num" />
          </div>
        </div>
      </Card>

      <Card title="Payments in" sub="Funding a job or topping up. The latest 50." flush>
        {payments === null ? (
          NEEDS_KEY
        ) : payments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">For</th>
                  <th className="th">Status</th>
                  <th className="th num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const st = paymentStatus(p.status);
                  return (
                    <tr key={p.id}>
                      <td className="td nowrap">{istDateTime(p.paidAt ?? p.createdAt)}</td>
                      <td className="td">{p.purpose === 'escrow' ? p.taskId ? <JobLink id={p.taskId} title="Funding a job" /> : 'Funding a job' : 'Wallet top-up'}</td>
                      <td className="td">
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </td>
                      <td className="td num">
                        <Money minor={p.amountMinor} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No payments yet" />
        )}
      </Card>

      <Card title="Manual corrections" sub="Changes an admin made to their wallet.">
        {u.adjustments.length ? (
          <ul className="plain-list">
            {u.adjustments.map((x, i) => (
              <li key={i}>
                <span>
                  {x.reason}
                  <span className="muted small block">{istDateTime(x.createdAt)}</span>
                </span>
                <Money minor={x.deltaMinor} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">None.</p>
        )}
      </Card>
    </div>
  );
}

const PLATFORM_LABEL: Record<string, string> = { android: 'Android', ios: 'iPhone / iPad', web: 'Web browser' };

/** The phones and browsers that can receive this person’s notifications. */
export function DevicesTab({ devices, now }: { devices: UserDevice[] | null; now: Date }) {
  return (
    <Card title="Devices" sub="Where this person has allowed notifications. Newest first.">
      {devices === null ? (
        NEEDS_KEY
      ) : devices.length ? (
        <ul className="plain-list">
          {devices.map((d, i) => (
            <li key={i}>
              <span>
                <strong>{PLATFORM_LABEL[d.platform] ?? d.platform}</strong>
                <span className="muted small block">
                  First seen {istDateTime(d.registeredAt)} · last active {timeAgo(d.lastSeenAt, now)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No device has allowed notifications" />
      )}
      <p className="muted small">App version and operating system will show here once the app starts reporting them.</p>
    </Card>
  );
}

/** What admins did to this person’s account, from the append-only audit log. */
export function AuditTab({ entries }: { entries: UserAuditEntry[] }) {
  return (
    <Card title="Admin actions on this person" sub="From the audit log. Newest first, the latest 50." flush>
      {entries.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="th">When</th>
                <th className="th">Who</th>
                <th className="th">What</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="td nowrap">{istDateTime(e.at)}</td>
                  <td className="td">{e.actor}</td>
                  <td className="td">
                    {e.action}
                    {e.detail ? <span className="muted small block">{e.detail}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nothing recorded" />
      )}
    </Card>
  );
}

/** Things staff must do about this person, with a form to add one. */
export function FollowUpsTab({ userId, items, staff, me }: { userId: string; items: Read<FollowUp[]>; staff: { id: string; name: string }[]; me: string }) {
  if (items.setup) return <SetupNotice what="Follow-ups" migration="094_crm_tasks_pipeline" />;
  return (
    <div className="grid-main-side">
      <Card title="Follow-ups about this person" flush>
        {items.data.length ? (
          <ul className="plain-list">
            {items.data.map((f) => (
              <li key={f.id}>
                <span>
                  <strong>{f.title}</strong>
                  <span className="muted small block">
                    {f.status === 'done' ? `Done${f.completedBy ? ` by ${f.completedBy}` : ''}` : `With ${f.owner}${f.dueAt ? `, due ${istDateTime(f.dueAt)}` : ''}`}
                  </span>
                  {f.detail ? <span className="small block">{f.detail}</span> : null}
                </span>
                <FinishButton taskId={f.id} reopen={f.status === 'done'} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No follow-ups yet" />
        )}
      </Card>
      <Card title="Add a follow-up">
        <FollowUpForm staff={staff} me={me} userId={userId} />
      </Card>
    </div>
  );
}
