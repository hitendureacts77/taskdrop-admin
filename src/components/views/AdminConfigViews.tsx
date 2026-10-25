import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AuditRow, Health, Integrations, Switch, SwitchKey, TeamMember } from '@/lib/admin-config';
import { AUDIT_TABLES, EVENT_WORDS } from '@/lib/admin-config';
import { allowlistActive, allowlistCount, type Allowlist } from '@/lib/allowlist';
import type { PayoutMethod } from '@/lib/data';
import { inr, istDateTime, phone as prettyPhone, timeAgo } from '@/lib/format';
import { AREA_LABEL, STAFF_ROLES, roleLabel, staffCan, type StaffArea, type StaffRole } from '@/lib/staff-roles';
import { ConfirmAction, type FormAction } from '../ConfirmAction';
import { Icon } from '../Icon';
import { NotifyToggle, StaffRoleForm } from '../StaffControls';
import { Card, Empty, Notice, PageHeader, Pager, Pill, Tabs } from '../ui';

// ------------------------------------------------------------------ header --

export type ConfigTab = 'team' | 'settings' | 'switches' | 'rules' | 'controls' | 'integrations' | 'health' | 'audit' | 'security';

const TABS: { key: ConfigTab; href: string; label: string }[] = [
  { key: 'team', href: '/settings/team', label: 'Team & access' },
  { key: 'settings', href: '/settings', label: 'Money & timing' },
  { key: 'switches', href: '/settings/switches', label: 'App switches' },
  { key: 'rules', href: '/settings/rules', label: 'Rules' },
  { key: 'controls', href: '/settings/controls', label: 'Web, Android & iOS' },
  { key: 'integrations', href: '/settings/integrations', label: 'Integrations' },
  { key: 'health', href: '/settings/health', label: 'System health' },
  { key: 'audit', href: '/settings/audit', label: 'Audit log' },
  { key: 'security', href: '/security', label: 'My security' },
];

/** The shared title and tab row for every Admin & configuration screen. */
export function ConfigHeader({ active, right }: { active: ConfigTab; right?: ReactNode }) {
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Admin & configuration' }]}
        title="Admin & configuration"
        sub="Who runs TaskDrop, the numbers and switches the app runs on, and how its systems are doing."
        right={right}
      />
      <Tabs label="Admin & configuration" items={TABS.map((t) => ({ href: t.href, label: t.label, active: t.key === active }))} />
    </>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

// -------------------------------------------------------------------- team --

const ROLE_LABEL: Record<string, string> = { poster: 'Posts jobs', worker: 'Works jobs' };

export function TeamView({
  team,
  meId,
  meRole,
  allowlist,
  serviceKey,
  add,
  remove,
  setRole,
  setNotify,
}: {
  team: TeamMember[];
  meId: string;
  meRole: StaffRole;
  allowlist: Allowlist;
  serviceKey: boolean;
  add: FormAction;
  remove: FormAction;
  setRole: FormAction;
  setNotify: FormAction;
}) {
  const locked = allowlistActive(allowlist);
  const allowed = allowlistCount(allowlist);
  const withMfa = team.filter((m) => m.authenticator).length;
  const manage = meRole === 'admin';
  return (
    <>
      <ConfigHeader active="team" />
      <div className="figures figures-cards">
        <div className="figure card">
          <span className="figure-label">Team</span>
          <span className="figure-num plain">{team.length}</span>
          <span className="muted small">
            {STAFF_ROLES.map((r) => ({ r, n: team.filter((m) => m.staffRole === r.value).length }))
              .filter((x) => x.n)
              .map((x) => `${x.n} ${x.r.label}`)
              .join(' · ') || 'nobody yet'}
          </span>
        </div>
        <div className="figure card">
          <span className="figure-label">Authenticator set up</span>
          <span className="figure-num plain">{serviceKey ? `${withMfa} of ${team.length}` : '—'}</span>
          <span className="muted small">needed to move money</span>
        </div>
        <div className="figure card">
          <span className="figure-label">Panel sign-in</span>
          <span className="figure-num plain">{locked ? 'Allowlist' : 'Role only'}</span>
          <span className="muted small">{locked ? `Only the ${allowed} ${allowed === 1 ? 'account' : 'accounts'} listed in ADMIN_EMAIL / ADMIN_PHONE get in` : 'Every admin can open this panel'}</span>
        </div>
      </div>

      {!serviceKey ? (
        <Notice tone="gold" icon="alert" title="Emails, last sign-in and authenticator status are hidden.">
          Add SUPABASE_SERVICE_ROLE_KEY to this server to see them.
        </Notice>
      ) : null}

      <Card
        title="Team"
        sub="Everyone who can run TaskDrop from this panel. Adding, removing or changing someone’s role asks for your authenticator code and is written to the audit log."
        right={
          !manage ? (
            <span className="muted small">You’re {roleLabel(meRole)}: only a full Admin can change the team.</span>
          ) : (
          <ConfirmAction
            action={add}
            hidden={{}}
            trigger="+ Add admin"
            title="Add someone to the team?"
            consequence={
              <>
                They will see every person, job and rupee in TaskDrop. What they can change depends on the role you pick.
                {locked ? (
                  <>
                    {' '}
                    This panel only lets in the {allowed === 1 ? 'account' : `${allowed} accounts`} listed in ADMIN_EMAIL / ADMIN_PHONE, so add theirs there too.
                  </>
                ) : null}
              </>
            }
            choice={{ name: 'role', label: 'Role', defaultValue: 'viewer', options: STAFF_ROLES.map((r) => ({ value: r.value, label: `${r.label}: ${r.short}` })) }}
            field={{ name: 'who', label: 'Their @username or Google address', placeholder: '@username or name@gmail.com', required: true, help: 'They must already have a TaskDrop account (signed in once).' }}
            confirmLabel="Add to the team"
          />
          )
        }
        flush
      >
        {team.length ? (
          <div className="table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Signs in with</th>
                  <th className="th">Role</th>
                  <th className="th">Alerts</th>
                  <th className="th">Panel access</th>
                  <th className="th">Authenticator</th>
                  <th className="th">Last signed in</th>
                  <th className="th right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => {
                  const me = m.id === meId;
                  return (
                    <tr key={m.id}>
                      <td className="td">
                        <span className="person">
                          <span className="avatar" aria-hidden="true">
                            {initials(m.name)}
                          </span>
                          <span className="stack-tight">
                            <Link href={`/users/${m.id}`} className="strong-link">
                              {m.name}
                            </Link>
                            <span className="muted small">
                              {m.username ? `@${m.username}` : 'no username'}
                              {me ? <span className="you-tag">You</span> : null}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="td small">{m.email && !m.email.endsWith('@phone.taskdrop.app') ? m.email : m.phone ? prettyPhone(m.phone) : m.email ? 'Phone account' : <span className="muted">—</span>}</td>
                      <td className="td">
                        {manage && !me ? (
                          <StaffRoleForm userId={m.id} role={m.staffRole} name={m.name} action={setRole} />
                        ) : (
                          <span className={`role-badge role-${m.staffRole}`}>{roleLabel(m.staffRole)}</span>
                        )}
                        {m.otherRoles.length ? (
                          <span className="role-badges role-also">
                            {m.otherRoles.map((r) => (
                              <span key={r} className="role-badge">
                                {ROLE_LABEL[r] ?? r}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </td>
                      <td className="td">
                        <NotifyToggle userId={m.id} role={m.staffRole} on={m.notify} name={m.name} action={setNotify} disabled={!me && !manage} />
                      </td>
                      <td className="td">
                        {m.canOpenPanel === null ? (
                          <Pill tone="grey">Unknown</Pill>
                        ) : m.canOpenPanel ? (
                          <Pill tone="green">Can sign in</Pill>
                        ) : (
                          <Pill tone="gold" title="Not listed in ADMIN_EMAIL / ADMIN_PHONE, so the panel turns them away">
                            Not on allowlist
                          </Pill>
                        )}
                      </td>
                      <td className="td">
                        {m.authenticator === null ? <Pill tone="grey">Unknown</Pill> : m.authenticator ? <Pill tone="green">Set up</Pill> : <Pill tone="red">Not set up</Pill>}
                      </td>
                      <td className="td small nowrap">{m.lastSignIn ? <span title={istDateTime(m.lastSignIn)}>{timeAgo(m.lastSignIn)}</span> : <span className="muted">—</span>}</td>
                      <td className="td right">
                        <span className="row-actions">
                          <Link href={`/users/${m.id}`} className="btn btn-small btn-icon" title={`Open ${m.name}`} aria-label={`Open ${m.name}`}>
                            <Icon name="external" size={15} />
                          </Link>
                          {me || !manage ? null : (
                            <ConfirmAction
                              action={remove}
                              hidden={{ userId: m.id }}
                              trigger="Remove"
                              tone="danger"
                              title={`Remove ${m.name}’s admin access?`}
                              consequence="They keep their TaskDrop account, jobs and money. They lose this panel and every admin power at once. You can add them back later."
                              confirmLabel="Remove admin access"
                            />
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No admins found">That shouldn’t happen while you’re signed in. Refresh the page.</Empty>
        )}
      </Card>

      <Card
        title="What each role can do"
        sub="Enforced by the database, not just this panel. Everyone can see everything and switch their own alerts. Alerts are an in-app notification and phone push: withdrawals and disputes go to Admin and Finance, help requests to Admin and Support. Sales has no alerts."
        flush
      >
        <div className="table-wrap">
          <table className="table-compact roles-matrix">
            <thead>
              <tr>
                <th className="th">Role</th>
                {(Object.keys(AREA_LABEL) as StaffArea[]).map((a) => (
                  <th key={a} className="th" title={AREA_LABEL[a]}>
                    {AREA_LABEL[a].split(':')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAFF_ROLES.map((r) => (
                <tr key={r.value}>
                  <td className="td">
                    <span className={`role-badge role-${r.value}`}>{r.label}</span>
                    <span className="muted small block">{r.short}</span>
                  </td>
                  {(Object.keys(AREA_LABEL) as StaffArea[]).map((a) => (
                    <td key={a} className="td" title={AREA_LABEL[a]}>
                      {staffCan(r.value, a) ? <Pill tone="green">Can change</Pill> : <span className="muted small">View only</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="card-body muted small roles-note">
          Money: payouts, refunds, wallet changes, disputes. People: help requests, customer notes, follow-ups, tags, messages, leads, moderation, suspensions, copyright. Admin: settings, app switches, the team and deleting accounts.
        </p>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- switches --

type SwitchInfo = { label: string; help: string; onText: string; offText: string; danger?: 'on' | 'off' };

const SWITCH_INFO: Record<SwitchKey, SwitchInfo> = {
  admin_require_mfa: {
    label: 'Authenticator code for money actions',
    help: 'Payouts, refunds, dispute decisions, wallet changes, settings and admin access ask for a code from your phone, on top of signing in.',
    onText: 'Every admin must enter an authenticator code before moving money. Admins without one set up can still look, but not act.',
    offText: 'Signing in alone is enough to move money. A stolen password or Google session could send payouts.',
    danger: 'off',
  },
  dev_otp_for_all: {
    label: 'Developer sign-in (dev_otp_for_all)',
    help: 'A testing switch: any phone number signs in with a code the app fills in by itself, with no text message sent.',
    onText: 'Anyone can sign in to ANY phone number’s account without receiving a text. Only for testing with fake data.',
    offText: 'Signing in needs the real code sent by text message. Make sure text messages work before switching this off.',
    danger: 'on',
  },
};

export function SwitchesView({ switches, payoutMethod, update }: { switches: Record<SwitchKey, Switch>; payoutMethod: PayoutMethod; update: FormAction }) {
  const devOn = switches.dev_otp_for_all.on;
  return (
    <>
      <ConfigHeader active="switches" />
      {devOn ? (
        <Notice tone="red" icon="alert" title="Developer sign-in is ON.">
          Anyone can sign in to any phone number’s account. Switch it off before real people use TaskDrop.
        </Notice>
      ) : null}
      <Card title="App switches" sub="On/off settings that change the app for everyone, the moment you confirm." flush>
        <ul className="settings">
          {(Object.keys(SWITCH_INFO) as SwitchKey[]).map((key) => {
            const s = switches[key];
            const info = SWITCH_INFO[key];
            const next = !s.on;
            const risky = (info.danger === 'on' && next) || (info.danger === 'off' && !next);
            return (
              <li key={key} className="setting">
                <div className="setting-text">
                  <strong>{info.label}</strong>
                  <span className="muted small">{info.help}</span>
                  <span className="muted small">{s.updatedAt ? `Last changed ${istDateTime(s.updatedAt)}` : 'Never changed'}</span>
                </div>
                <div className="setting-value">
                  <Pill tone={s.on ? (info.danger === 'on' ? 'red' : 'green') : info.danger === 'off' ? 'red' : 'grey'}>{s.on ? 'On' : 'Off'}</Pill>
                </div>
                <ConfirmAction
                  action={update}
                  hidden={{ key, on: String(next) }}
                  asSwitch={{ on: s.on }}
                  trigger={`${info.label}: turn ${next ? 'on' : 'off'}`}
                  tone={risky ? 'danger' : 'primary'}
                  title={`Turn ${next ? 'on' : 'off'} “${info.label}”?`}
                  consequence={next ? info.onText : info.offText}
                  field={key === 'dev_otp_for_all' && next ? { name: 'confirm', label: 'Type ON to confirm', required: true, placeholder: 'ON' } : undefined}
                  confirmLabel={`Turn ${next ? 'on' : 'off'}`}
                />
              </li>
            );
          })}
          <li className="setting">
            <div className="setting-text">
              <strong>How withdrawals are paid</strong>
              <span className="muted small">By hand (you send each one and type the UTR) or automatically through RazorpayX.</span>
            </div>
            <div className="setting-value">
              <Pill tone={payoutMethod === 'razorpayx' ? 'blue' : 'grey'}>{payoutMethod === 'razorpayx' ? 'RazorpayX' : 'By hand'}</Pill>
            </div>
            <Link href="/payouts" className="btn btn-small">
              Change on Payouts
            </Link>
          </li>
        </ul>
      </Card>
    </>
  );
}

// ------------------------------------------------------------ integrations --

function Integration({ icon, name, status, tone, children }: { icon: string; name: string; status: string; tone: 'green' | 'gold' | 'red' | 'grey' | 'blue'; children: ReactNode }) {
  return (
    <li className="integration card">
      <div className="integration-head">
        <span className="stat-icon" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
        <strong>{name}</strong>
        <Pill tone={tone}>{status}</Pill>
      </div>
      <div className="integration-body">{children}</div>
    </li>
  );
}

export function IntegrationsView({ i }: { i: Integrations }) {
  const n = allowlistCount(i.allowlist);
  const allow = n > 1 ? `${n} accounts` : i.allowlist.emails[0] || (i.allowlist.phones[0] ? `+91 ${i.allowlist.phones[0]}` : '');
  const rx = i.razorpayx;
  return (
    <>
      <ConfigHeader active="integrations" />
      <ul className="integrations">
        <Integration icon="bolt" name="Supabase" status={i.supabase.ok ? 'Connected' : 'Not reachable'} tone={i.supabase.ok ? 'green' : 'red'}>
          <p>Database, sign-in and file storage for the app and this panel.</p>
          <dl className="mini-kv">
            <dt>Project</dt>
            <dd>
              <code>{i.supabase.projectRef || '—'}</code>
            </dd>
            <dt>Answered in</dt>
            <dd>{i.supabase.ms !== null ? `${i.supabase.ms} ms` : i.supabase.error}</dd>
          </dl>
        </Integration>

        <Integration icon="shield" name="Service key" status={i.serviceKey ? 'Set' : 'Missing'} tone={i.serviceKey ? 'green' : 'gold'}>
          <p>Server-only key for the few things an admin session can’t read: refunds owed, payment ids, people’s email and phone, authenticator status.</p>
          {!i.serviceKey ? <p className="muted small">Add SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables.</p> : null}
        </Integration>

        <Integration icon="people" name="Panel sign-in" status={allow ? 'Allowlist on' : 'Role only'} tone={allow ? 'green' : 'gold'}>
          <p>Google, or @username and password. Signs you out after {i.idleMinutes} minutes idle.</p>
          <dl className="mini-kv">
            <dt>{n > 1 ? 'Allowed accounts' : 'Allowed account'}</dt>
            <dd>{allow || 'Any account with the admin role'}</dd>
          </dl>
        </Integration>

        <Integration
          icon="send"
          name="RazorpayX payouts"
          status={!rx.configured ? 'Not set up' : rx.error ? 'Error' : 'Connected'}
          tone={!rx.configured ? 'grey' : rx.error ? 'red' : 'green'}
        >
          <p>Sends workers’ withdrawals to their bank or UPI automatically.</p>
          <dl className="mini-kv">
            <dt>Withdrawals paid</dt>
            <dd>{i.payoutMethod === 'razorpayx' ? 'Through RazorpayX' : 'By hand'}</dd>
            {rx.configured ? (
              <>
                <dt>Balance</dt>
                <dd>{rx.balanceMinor !== null ? inr(rx.balanceMinor) : rx.error ?? '—'}</dd>
              </>
            ) : null}
          </dl>
        </Integration>

        <Integration icon="money" name="Razorpay payments" status={i.lastPayment ? 'Receiving' : i.serviceKey ? 'No payments yet' : 'Unknown'} tone={i.lastPayment ? 'green' : 'grey'}>
          <p>Posters pay for jobs, top-ups and promotions through Razorpay checkout.</p>
          <dl className="mini-kv">
            <dt>Last payment</dt>
            <dd>{i.lastPayment ? `${timeAgo(i.lastPayment)} · ${istDateTime(i.lastPayment)}` : '—'}</dd>
          </dl>
        </Integration>

        <Integration icon="megaphone" name="Push notifications" status={i.pushDevices === null ? 'Unknown' : i.pushDevices > 0 ? 'Active' : 'No devices'} tone={i.pushDevices ? 'green' : 'grey'}>
          <p>Phone notifications for quotes, messages, payouts and your CRM messages.</p>
          <dl className="mini-kv">
            <dt>Phones registered</dt>
            <dd>{i.pushDevices === null ? '—' : i.pushDevices.toLocaleString('en-IN')}</dd>
          </dl>
        </Integration>
      </ul>
      <p className="muted small">Keys and secrets are never shown here. Change them in Vercel (this panel) or in Supabase → Edge Functions → Secrets (the app).</p>
    </>
  );
}

// ------------------------------------------------------------------ health --

export function HealthView({ h }: { h: Health }) {
  const failing = h.checks.filter((c) => !c.ok);
  const waiting = h.queues.payouts + h.queues.disputes + h.queues.refunds + h.queues.support;
  return (
    <>
      <ConfigHeader
        active="health"
        right={
          <Link href="/settings/health" className="btn btn-small" prefetch={false}>
            <Icon name="refresh" size={14} /> Check again
          </Link>
        }
      />
      {failing.length ? (
        <Notice tone="red" icon="alert" title={`${failing.length} check${failing.length === 1 ? '' : 's'} failing.`}>
          {failing.map((c) => c.name).join(', ')}. Details below.
        </Notice>
      ) : (
        <Notice tone="green" title="Everything is working.">
          Checked {istDateTime(h.checkedAt)}.
        </Notice>
      )}

      <div className="grid-main-side">
        <Card title="Checks" sub="Each feature, tested by reading the table or function it depends on." flush>
          <ul className="health-list">
            {h.checks.map((c) => (
              <li key={c.name}>
                <span className={`health-dot ${c.ok ? 'ok' : 'bad'}`} aria-hidden="true" />
                <span className="health-text">
                  <strong>{c.name}</strong>
                  <span className="muted small">{c.what}</span>
                  {!c.ok ? <span className="health-err small">{c.detail}</span> : null}
                </span>
                <span className="health-ms small">{c.ok ? (c.ms !== null ? `${c.ms} ms` : c.detail) : 'Failing'}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="stack">
          <Card title="Waiting for you" sub={waiting ? `${waiting} in all` : 'Nothing waiting'}>
            <ul className="plain-list">
              {[
                { label: 'Payouts', n: h.queues.payouts, href: '/payouts' },
                { label: 'Disputes', n: h.queues.disputes, href: '/disputes' },
                { label: 'Refunds', n: h.queues.refunds, href: '/refunds' },
                { label: 'Help requests', n: h.queues.support, href: '/support' },
              ].map((q) => (
                <li key={q.label}>
                  <Link href={q.href}>{q.label}</Link>
                  <span className={q.n ? 'nav-badge alert' : 'muted'}>{q.n}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Latest activity" sub="If these stop moving, something upstream may be stuck.">
            <ul className="plain-list">
              {h.latest.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                  <span className="muted small" title={l.at ? istDateTime(l.at) : undefined}>
                    {l.at ? timeAgo(l.at) : 'Never'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="This server">
            <dl className="mini-kv">
              <dt>Environment</dt>
              <dd>{h.runtime.env}</dd>
              <dt>Version</dt>
              <dd>{h.runtime.commit ? <code>{h.runtime.commit}</code> : '—'}</dd>
              <dt>Region</dt>
              <dd>{h.runtime.region ?? '—'}</dd>
              <dt>Node</dt>
              <dd>{h.runtime.node}</dd>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

// --------------------------------------------------------------- audit log --

function describe(r: AuditRow): string {
  const verb = r.action.split(' ')[0]?.toUpperCase();
  const what = (r.table && AUDIT_TABLES[r.table]) ?? r.table ?? 'something';
  if (r.table === 'settings') {
    const before = (r.before as { value?: unknown } | null)?.value;
    const after = (r.after as { value?: unknown } | null)?.value;
    const fmt = (v: unknown) => (v === undefined ? '—' : JSON.stringify(v));
    if (verb === 'UPDATE') return `Changed ${r.targetId}: ${fmt(before)} → ${fmt(after)}`;
    if (verb === 'INSERT') return `Added ${r.targetId}: ${fmt(after)}`;
  }
  if (r.table === 'user_roles') {
    const role = ((r.after ?? r.before) as { role?: string } | null)?.role ?? 'a role';
    return verb === 'DELETE' ? `Removed ${role} access` : `Gave ${role} access`;
  }
  if (r.table === 'payouts') {
    const a = r.after as { status?: string } | null;
    const b = r.before as { status?: string } | null;
    if (verb === 'UPDATE' && a?.status && b?.status && a.status !== b.status) return `Withdrawal ${b.status} → ${a.status}`;
    if (verb === 'INSERT') return !a?.status || a.status === 'requested' ? 'Withdrawal requested' : `Withdrawal added as ${a.status}`;
  }
  // A staff action (admin_log_event): say what it was, not "Changed event".
  if (r.table === 'event') return EVENT_WORDS[r.action] ?? r.action.replace(/[._]/g, ' ');
  return `${verb === 'INSERT' ? 'Added' : verb === 'DELETE' ? 'Removed' : 'Changed'} ${what.toLowerCase()}`;
}

function targetHref(r: AuditRow): string | null {
  if (!r.targetId) return null;
  if (r.table === 'payouts') return `/payouts/${r.targetId}`;
  if (r.table === 'user_roles' || r.table === 'user_suspensions') {
    const uid = ((r.after ?? r.before) as { user_id?: string } | null)?.user_id;
    return uid ? `/users/${uid}` : null;
  }
  return null;
}

export function AuditView({ rows, total, table, page, pageSize }: { rows: AuditRow[]; total: number; table: string | null; page: number; pageSize: number }) {
  const base = (t: string | null, p = 0) => `/settings/audit?${new URLSearchParams({ ...(t ? { table: t } : {}), ...(p ? { page: String(p) } : {}) })}`;
  return (
    <>
      <ConfigHeader active="audit" />
      <Card
        title="Audit log"
        sub="Every change to money, settings and admin access, recorded by the database itself. Nobody can edit or delete these lines."
        flush
      >
        <div className="card-body audit-filters">
          <Tabs
            small
            label="Filter by"
            items={[{ href: base(null), label: 'Everything', active: !table }, ...Object.entries(AUDIT_TABLES).map(([k, label]) => ({ href: base(k), label, active: table === k }))]}
          />
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table-compact">
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">Who</th>
                  <th className="th">Area</th>
                  <th className="th">What happened</th>
                  <th className="th">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const href = targetHref(r);
                  return (
                    <tr key={r.id}>
                      <td className="td small nowrap" title={istDateTime(r.at)}>
                        {istDateTime(r.at)}
                      </td>
                      <td className="td small">{r.actor ? <Link href={`/users/${r.actor}`}>{r.actorName}</Link> : <span className="muted">{r.actorName}</span>}</td>
                      <td className="td">
                        <span className="role-badge">{(r.table && AUDIT_TABLES[r.table]) ?? r.table ?? '—'}</span>
                      </td>
                      <td className="td small">
                        {href ? <Link href={href}>{describe(r)}</Link> : describe(r)}
                        {r.detail ? <span className="muted block">{r.detail}</span> : null}
                      </td>
                      <td className="td small">
                        <details className="audit-raw">
                          <summary>Before / after</summary>
                          <pre>{JSON.stringify({ before: r.before, after: r.after }, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing recorded yet">Changes show up here as soon as anyone makes them.</Empty>
        )}
        <div className="card-body">
          <Pager page={page} pageSize={pageSize} total={total} hrefFor={(p) => base(table, p)} />
        </div>
      </Card>
    </>
  );
}
