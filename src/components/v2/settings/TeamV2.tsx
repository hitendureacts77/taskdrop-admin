import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import type { FormAction } from '@/components/ConfirmAction';
import type { TeamMember } from '@/lib/admin-config';
import { allowlistActive, allowlistCount, type Allowlist } from '@/lib/allowlist';
import { istDateTime } from '@/lib/format';
import { roleLabel, staffCan, STAFF_ROLES, type StaffRole } from '@/lib/staff-roles';
import { isTestUserId } from '@/lib/test-data';
import { SettingsHead } from './SettingsHead';

const SIGNS_IN: (m: TeamMember) => string = (m) => (m.email?.endsWith('@phone.taskdrop.app') ? '@username and password' : m.email ? 'Google' : m.username ? '@username' : 'Unknown');

const CAN: Record<StaffRole, ['Change' | 'View only' | 'Hidden', 'Change' | 'View only' | 'Hidden', 'Change' | 'View only' | 'Hidden']> = {
  admin: ['Change', 'Change', 'Change'],
  finance: ['Change', 'View only', 'View only'],
  support: ['View only', 'Change', 'View only'],
  sales: ['Hidden', 'Change', 'Hidden'],
  viewer: ['View only', 'View only', 'View only'],
};

/** v2 Team & access (design setTeam, F361–F372). Every write is today's server action. */
export function TeamV2({
  team,
  meId,
  role,
  allowlist,
  serviceKey,
  add,
  remove,
  setRole,
  setNotify,
  endAll,
}: {
  team: TeamMember[];
  meId: string;
  role: StaffRole;
  allowlist: Allowlist;
  serviceKey: boolean;
  add: FormAction;
  remove: FormAction;
  setRole: FormAction;
  setNotify: FormAction;
  endAll: FormAction;
}) {
  const admin = staffCan(role, 'admin');
  const counts = STAFF_ROLES.map((r) => ({ label: r.label, n: team.filter((m) => m.staffRole === r.value).length })).filter((c) => c.n > 0);
  const known = team.every((m) => m.authenticator !== null);
  const withMfa = team.filter((m) => m.authenticator).length;
  const listOn = allowlistActive(allowlist);
  const blocked = team.filter((m) => m.canOpenPanel === false).length;

  return (
    <>
      <SettingsHead active="/settings/team" role={role} />
      <v2.Grid cols={3}>
        <v2.Tile label="Team" value={team.length} foot={counts.map((c) => `${c.n} ${c.label}`).join(' · ') || 'Nobody yet'} />
        <v2.Tile label="Authenticator set up" value={known ? `${withMfa} of ${team.length}` : '—'} foot={<v2.OffTag />} />
        <v2.Tile
          label="Panel sign-in"
          value={listOn ? 'Allowlist' : 'Role only'}
          foot={listOn ? `Only the ${allowlistCount(allowlist)} account${allowlistCount(allowlist) === 1 ? '' : 's'} listed in ADMIN_EMAIL / ADMIN_PHONE get in` : 'The role on this page is enough to sign in'}
        />
      </v2.Grid>
      {listOn && blocked > 0 ? (
        <div className="wp8a-mt">
          <v2.Note tone="orange" title={`${blocked} of ${team.length} staff can’t sign in: they are not on the allowlist.`}>
            Either add their emails to the allowlist (ask the developer, it is a server setting), or switch sign-in to “role only” so the role on this page is enough. Owner decision: keep the allowlist. <v2.NewTag />
          </v2.Note>
        </div>
      ) : null}
      <div className="wp8a-mt">
        <v2.Card
          title="Team"
          sub="Adding, removing or changing someone’s role asks you to confirm and is written to the audit log."
          right={
            <div className="wp8a-actions">
              <Confirm
                action={endAll}
                label="End all staff sessions"
                small
                tone="warn"
                tier={2}
                area="admin"
                title="Sign every other staff member out?"
                body={<p>Everyone except you has to sign in again.</p>}
                reason={{ label: 'Why? (saved in the audit log)' }}
                confirmLabel="End sessions"
              />
              <Confirm
                action={add}
                label="Add admin"
                small
                tone="pri"
                tier={2}
                area="admin"
                title="Add someone to the team"
                body={<p>They must already have a TaskDrop account.{listOn ? ' They also need to be on the allowlist to open the panel.' : ''}</p>}
                fields={
                  <>
                    <label htmlFor="na">@username or Google address</label>
                    <input id="na" name="who" required maxLength={80} placeholder="@name or name@gmail.com" />
                    <label htmlFor="nr">Role</label>
                    <select id="nr" name="role" defaultValue="viewer">
                      {STAFF_ROLES.slice()
                        .reverse()
                        .map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                    </select>
                  </>
                }
                confirmLabel="Add"
              />
            </div>
          }
        >
          <v2.DataTable
            columns={[{ label: 'Name' }, { label: 'Signs in with' }, { label: 'Role' }, { label: 'Alerts' }, { label: 'Panel access' }, { label: 'Authenticator' }, { label: 'Last signed in' }, { label: '' }]}
            empty="No staff yet"
            rows={team.map((m) => {
              const you = m.id === meId;
              return {
                key: m.id,
                test: isTestUserId(m.id),
                cells: [
                  <span key="n">
                    <b>{m.name}</b>
                    {you ? <span className="v2-tag-role wp8a-you">You</span> : null}
                    <div className="v2-muted wp8a-small">{m.email ?? (m.username ? `@${m.username}` : '')}</div>
                  </span>,
                  <span key="s" className="wp8a-small">
                    {SIGNS_IN(m)}
                  </span>,
                  you || !admin ? (
                    <span key="r" className="v2-tag-role">
                      {roleLabel(m.staffRole)}
                    </span>
                  ) : (
                    <Confirm
                      key="r"
                      action={setRole}
                      hidden={{ userId: m.id }}
                      label={roleLabel(m.staffRole)}
                      small
                      tone="plain"
                      tier={2}
                      area="admin"
                      title={`Change ${m.name}’s role?`}
                      body={<p>Now {roleLabel(m.staffRole)}. What they can see and change switches straight away. At least one Admin must remain.</p>}
                      fields={
                        <>
                          <label htmlFor={`role-${m.id}`}>New role</label>
                          <select id={`role-${m.id}`} name="role" defaultValue={m.staffRole}>
                            {STAFF_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}: {r.short}
                              </option>
                            ))}
                          </select>
                        </>
                      }
                      confirmLabel="Change role"
                    />
                  ),
                  <Confirm
                    key="a"
                    action={setNotify}
                    hidden={{ userId: m.id, role: m.staffRole, on: String(!m.notify) }}
                    label={`Staff alerts for ${m.name}`}
                    asSwitch={{ on: m.notify }}
                    tier={1}
                    area={you ? 'any' : 'admin'}
                  />,
                  m.canOpenPanel === null ? (
                    <v2.Pill key="p" tone="mut">
                      Unknown
                    </v2.Pill>
                  ) : m.canOpenPanel ? (
                    <v2.Pill key="p" tone="ok">
                      Can sign in
                    </v2.Pill>
                  ) : (
                    <v2.Pill key="p" tone="wait">
                      Not on allowlist
                    </v2.Pill>
                  ),
                  m.authenticator ? (
                    <v2.Pill key="m" tone="ok">
                      Set up
                    </v2.Pill>
                  ) : (
                    <v2.OffTag key="m">Not set up</v2.OffTag>
                  ),
                  <span key="l" className="wp8a-small">
                    {m.lastSignIn ? istDateTime(m.lastSignIn) : '—'}
                  </span>,
                  you ? (
                    <span key="x" />
                  ) : (
                    <Confirm
                      key="x"
                      action={remove}
                      hidden={{ userId: m.id }}
                      label="Remove"
                      small
                      tone="danger"
                      tier={3}
                      area="admin"
                      word="REMOVE"
                      title={`Remove ${m.name}’s admin access?`}
                      body={<p>They can no longer open the panel. Their own TaskDrop account stays.</p>}
                      confirmLabel="Remove access"
                    />
                  ),
                ],
              };
            })}
          />
        </v2.Card>
      </div>
      <p className="v2-muted wp8a-small">
        {serviceKey ? '' : 'Emails, last sign-in and authenticator are hidden: the server key is not set on this server. '}
        The alerts switch for your own row works for every role.
      </p>
      <div className="wp8a-mt">
        <v2.Card
          title="What each role can do"
          sub="Money = payouts, refunds, wallet changes, disputes. People = help, notes, follow-ups, tags, messages, leads, moderation, suspensions, copyright. Admin = settings, app switches, team, deleting accounts. Viewer sees everything and changes nothing."
        >
          <v2.DataTable
            columns={[{ label: 'Role' }, { label: 'Money' }, { label: 'People' }, { label: 'Admin' }]}
            rows={STAFF_ROLES.map((r) => ({
              key: r.value,
              cells: [
                <b key="r">{r.label}</b>,
                ...CAN[r.value].map((x, i) => (
                  <v2.Pill key={i} tone={x === 'Change' ? 'ok' : x === 'Hidden' ? 'mut' : 'earn'}>
                    {x}
                  </v2.Pill>
                )),
              ],
            }))}
          />
        </v2.Card>
      </div>
    </>
  );
}
