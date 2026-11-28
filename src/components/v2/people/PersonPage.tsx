import Link from 'next/link';
import type { ReactNode } from 'react';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import { MiniButton, BroadcastForm, NoteForm, TagForm } from '@/components/CrmForms';
import { OwnerForm } from '@/components/CrmOwnerForms';
import { FinishButton, FollowUpForm } from '@/components/GrowthForms';
import { TagChip } from '@/components/views/PersonCrm';
import { USER_TABS, type UserTab } from '@/components/views/UserTabs';
import type { PersonCrm, TimelineEvent } from '@/lib/crm';
import { deleteAccount, deleteNote, removeTag, suspendUser, unsuspendUser, updateNote } from '@/lib/crm-actions';
import type { MoneySettings, UserDetail } from '@/lib/data';
import { isTestName } from '@/lib/data';
import { inr, istDate, istDateTime, phone, timeAgo } from '@/lib/format';
import type { FollowUp, Read } from '@/lib/growth';
import { initials, payoutStatus, taskStatus, type Tone as OldTone } from '@/lib/labels';
import { signOutEverywhere } from '@/lib/session-actions';
import { isTestTitle, isTestUserId } from '@/lib/test-data';
import type { UserAuditEntry, UserDevice, UserPayment, UserSignIn, UserWarning } from '@/lib/user360';
import { warnPerson } from '@/lib/v2/people-actions';
import { Lock } from './Lock';

/** Today's label tones in the v2 colour words (jade = poster, blue = worker, gold = held money). */
const TONE: Record<OldTone, v2.Tone> = { green: 'ok', blue: 'earn', gold: 'wait', red: 'danger', grey: 'mut' };

/** What each delete blocker means for the admin (same words as today's DeleteAccountCard). */
const BLOCKER_FOR_ADMIN: Record<string, (first: string) => string> = {
  ADMIN: (f) => `${f} is an admin. Remove the admin role first.`,
  BALANCE: (f) => `${f}’s wallet isn’t at zero. Pay it out to them, or settle it, first.`,
  CLEARING: (f) => `Some of ${f}’s earnings are still clearing into their wallet.`,
  PAYOUT: (f) => `A withdrawal is still on its way to ${f}.`,
  TASKS_ACTIVE: (f) => `A job ${f} posted is in progress or in dispute.`,
  TASKS_FUNDED: (f) => `An open job ${f} posted is already paid for. Cancel it so the money goes back to their wallet.`,
  WORK_ACTIVE: (f) => `${f} is working on a job right now.`,
  PROMOTION: (f) => `A promotion of ${f}’s is still running or not settled yet.`,
  PAYMENT_PENDING: (f) => `A payment ${f} started in the last hour is still going through.`,
};

const PLATFORM_LABEL: Record<string, string> = { android: 'Android', ios: 'iPhone / iPad', web: 'Web browser', windows: 'Windows', macos: 'Mac' };

export type PersonTabs = {
  payments?: UserPayment[] | null;
  followUps?: { items: Read<FollowUp[]>; me: string };
  devices?: { list: UserDevice[] | null; signIn: UserSignIn | null; canSignOut: boolean };
  audit?: UserAuditEntry[];
};

export function PersonPage({
  u,
  settings,
  now: nowIso,
  crm,
  timeline,
  tab,
  hideMoney,
  hideTest,
  warnings,
  data,
}: {
  u: UserDetail;
  settings: MoneySettings;
  now: string;
  crm: PersonCrm;
  timeline: TimelineEvent[];
  tab: UserTab;
  hideMoney: boolean;
  hideTest: boolean;
  warnings: { setup: boolean; rows: UserWarning[] };
  data: PersonTabs;
}) {
  const now = new Date(nowIso);
  const first = u.name.split(' ')[0] ?? u.name;
  const isAdmin = u.roles.includes('admin');
  const isTest = isTestUserId(u.id) || isTestName(u.name);

  const header = (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'People', href: '/users' }, { label: u.name }]}
        title={
          <span className="wp3-who lg">
            <span className={`wp3-av lg${u.isWorker ? ' b' : ''}`} aria-hidden="true">
              {initials(u.name)}
            </span>
            <span>
              {u.name}
              <v2.TestTag show={isTest} />
            </span>
          </span>
        }
        sub={
          <>
            <span className="v2-row wp3-pills">
              {isAdmin ? <v2.Pill tone="wait">Admin</v2.Pill> : null}
              {u.isWorker ? <v2.Pill tone="earn">Worker</v2.Pill> : null}
              <v2.Pill tone="ok">Poster</v2.Pill>
              {u.availableNow ? <v2.Pill tone="ok">Available now</v2.Pill> : null}
              {crm.suspension ? <v2.Pill tone="danger">Suspended</v2.Pill> : null}
              {u.deletion ? <v2.Pill tone="mut">Deleted</v2.Pill> : null}
              {crm.tags.map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </span>
            <span className="small v2-muted block wp3-meta">
              {u.username ? `@${u.username} · ` : ''}
              {u.place ? `${u.place} · ` : ''}joined {istDate(u.joinedAt)}
              {u.lastSeenAt ? ` · last seen ${timeAgo(u.lastSeenAt, now)}` : ''}
            </span>
          </>
        }
        right={
          u.deletion ? null : (
            <div className="v2-row">
              <Confirm
                action={warnPerson}
                hidden={{ userId: u.id }}
                label={
                  <>
                    Warn <v2.NewTag />
                  </>
                }
                tier={2}
                area="people"
                tone="warn"
                title={`Warn ${u.name}?`}
                body={<p>{first} sees this message in their TaskDrop notifications, with a reminder to follow the community rules. It is kept on their record and in the audit log.</p>}
                reason={{ label: 'Message they read', placeholder: 'e.g. Please keep payments inside the app.' }}
                confirmLabel="Send warning"
              />
              {isAdmin || crm.suspension ? null : (
                <Confirm
                  action={suspendUser}
                  hidden={{ userId: u.id, name: first }}
                  label="Suspend"
                  tier={2}
                  area="people"
                  tone="danger"
                  title={`Suspend ${u.name}?`}
                  body={
                    <ul>
                      <li>{first} is signed out now and can’t sign in or withdraw until you let them back in.</li>
                      <li>Their jobs and wallet money stay exactly as they are.</li>
                      <li>You can undo this any time. Admins can’t be suspended.</li>
                    </ul>
                  }
                  reason={{ label: 'Reason (kept on their record)', placeholder: 'e.g. posting spam jobs' }}
                  confirmLabel={`Suspend ${first}`}
                />
              )}
            </div>
          )
        }
      />

      {u.deletion ? (
        <v2.Note title="This account was deleted">
          {u.deletion.by ? <>Deleted by {u.deletion.by}</> : <>The person deleted it themselves</>}, {istDateTime(u.deletion.at)}
          {u.deletion.reason ? <> · “{u.deletion.reason}”</> : null}. Their name, contact details and sign-in are gone and it can’t be signed in to again. Paid jobs,
          payments and withdrawals stay for the records, as “Deleted user”.
        </v2.Note>
      ) : crm.suspension ? (
        <v2.Blocker
          title={`${u.name} is suspended.`}
          action={
            <Confirm
              action={unsuspendUser}
              hidden={{ userId: u.id, name: first }}
              label={`Let ${first} back in`}
              tier={2}
              area="people"
              tone="plain"
              title={`Let ${u.name} back in?`}
              body={<p>They can use TaskDrop as normal straight away, and get a notification saying so.</p>}
              fields={
                <>
                  <label htmlFor="wp3-lift-note">Note (optional)</label>
                  <textarea id="wp3-lift-note" name="note" rows={2} maxLength={500} placeholder="e.g. sorted it out on a call" />
                </>
              }
              confirmLabel="Let them back in"
            />
          }
        >
          “{crm.suspension.reason}” · by {crm.suspension.by} · {istDateTime(crm.suspension.at)}. {first} can’t sign in or withdraw. Their jobs and money are exactly where they were.
        </v2.Blocker>
      ) : null}

      <v2.Tabs
        label="Sections"
        items={USER_TABS.filter((t) => !(hideMoney && t.key === 'money')).map((t) => ({
          href: `/users/${u.id}${t.key === 'overview' ? '' : `?tab=${t.key}`}`,
          label: t.label,
          active: t.key === tab,
        }))}
      />
    </>
  );

  let body: ReactNode;
  if (tab === 'money' && !hideMoney) body = <MoneyTab u={u} payments={data.payments ?? null} settings={settings} />;
  else if (tab === 'followups' && data.followUps) body = <FollowUpsTab userId={u.id} items={data.followUps.items} staff={crm.staff} me={data.followUps.me} now={now} />;
  else if (tab === 'devices' && data.devices) body = <DevicesTab u={u} now={now} {...data.devices} />;
  else if (tab === 'audit' && data.audit) body = <AuditTab entries={data.audit} />;
  else body = <Overview u={u} settings={settings} now={now} crm={crm} timeline={timeline} hideMoney={hideMoney} hideTest={hideTest} warnings={warnings} />;

  return (
    <>
      {header}
      {body}
    </>
  );
}

function Overview({
  u,
  settings,
  now,
  crm,
  timeline,
  hideMoney,
  hideTest,
  warnings,
}: {
  u: UserDetail;
  settings: MoneySettings;
  now: Date;
  crm: PersonCrm;
  timeline: TimelineEvent[];
  hideMoney: boolean;
  hideTest: boolean;
  warnings: { setup: boolean; rows: UserWarning[] };
}) {
  const first = u.name.split(' ')[0] ?? u.name;
  // Hide test data: leave out [e2e] jobs from their job lists.
  const posted = hideTest ? u.posted.filter((t) => !isTestTitle(t.title)) : u.posted;
  const worked = hideTest ? u.worked.filter((t) => !isTestTitle(t.title)) : u.worked;

  return (
    <v2.Grid cols="main">
      <div className="wp3-stack">
        {hideMoney ? null : (
          <v2.Card title={`${first}’s wallet`} sub="Money TaskDrop holds for this person. It is theirs, not TaskDrop’s.">
            <v2.Grid cols={2}>
              <v2.Tile small tone="blue" label="Ready to withdraw" value={inr(u.walletMinor)} foot={<a href="#withdrawals">Their withdrawals →</a>} />
              <v2.Tile small label="Still clearing" value={inr(u.clearingMinor)} foot={`Withdrawable ${settings.clearingDays} days after approval.`} />
            </v2.Grid>
            <Corrections u={u} />
          </v2.Card>
        )}

        <v2.Card title="Notes & follow-ups" sub="Private to staff. Add a reminder date and it shows on the Customer hub when it’s due.">
          <Lock area="people">
            <NoteForm userId={u.id} />
          </Lock>
          {crm.notes.length ? (
            <ul className="wp3-notes">
              {crm.notes.map((n) => {
                const overdue = n.followUpAt && !n.doneAt && new Date(n.followUpAt).getTime() <= now.getTime();
                return (
                  <li key={n.id} className={n.pinned ? 'pinned' : undefined}>
                    <div className="wp3-spread">
                      <span className="small v2-muted">
                        {n.pinned ? '📌 ' : ''}
                        {n.author} · {istDateTime(n.createdAt)}
                        {n.followUpAt ? (
                          <>
                            {' · '}
                            {n.doneAt ? (
                              <>follow-up done {istDate(n.doneAt)}</>
                            ) : (
                              <b className={overdue ? 'wp3-due' : undefined}>
                                follow up {istDate(n.followUpAt)}
                                {overdue ? ' (due)' : ''}
                              </b>
                            )}
                          </>
                        ) : null}
                      </span>
                      <Lock area="people">
                        <span className="v2-row wp3-note-acts">
                          <MiniButton action={updateNote} hidden={{ noteId: n.id, userId: u.id, what: n.pinned ? 'unpin' : 'pin' }}>
                            {n.pinned ? 'Unpin' : 'Pin'}
                          </MiniButton>
                          {n.followUpAt ? (
                            <MiniButton action={updateNote} hidden={{ noteId: n.id, userId: u.id, what: n.doneAt ? 'reopen' : 'done' }}>
                              {n.doneAt ? 'Reopen' : 'Done'}
                            </MiniButton>
                          ) : null}
                          <MiniButton action={deleteNote} hidden={{ noteId: n.id, userId: u.id }} title="Delete note">
                            Delete
                          </MiniButton>
                        </span>
                      </Lock>
                    </div>
                    <p className="wp3-note-body">{n.body}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="small v2-muted">No notes yet.</p>
          )}
        </v2.Card>

        <v2.Card title={`Jobs ${first} posted`}>
          <v2.DataTable
            columns={[{ label: 'Job' }, { label: 'Status' }, { label: 'Price', right: true }, { label: 'Posted' }]}
            rows={posted.map((t) => {
              const st = taskStatus(t.status);
              return {
                key: t.id,
                href: `/tasks/${t.id}`,
                test: isTestTitle(t.title),
                cells: [t.title, <v2.Pill key="s" tone={TONE[st.tone as OldTone] ?? 'mut'}>{st.label}</v2.Pill>, t.priceMinor !== null ? inr(t.priceMinor) : '—', <span key="d" className="small nowrap">{istDate(t.createdAt)}</span>],
              };
            })}
            empty="Hasn’t posted a job"
          />
        </v2.Card>

        <v2.Card title={`Jobs ${first} worked on`}>
          <v2.DataTable
            columns={[{ label: 'Job' }, { label: 'Status' }, ...(hideMoney ? [] : [{ label: 'Poster paid', right: true }]), { label: 'Hired' }]}
            rows={worked.map((t) => {
              const st = taskStatus(t.status);
              return {
                key: `${t.id}-${t.createdAt}`,
                href: `/tasks/${t.id}`,
                test: isTestTitle(t.title),
                cells: [
                  t.title,
                  <v2.Pill key="s" tone={TONE[st.tone as OldTone] ?? 'mut'}>{st.label}</v2.Pill>,
                  ...(hideMoney ? [] : [inr(t.escrowMinor)]),
                  <span key="d" className="small nowrap">{istDate(t.createdAt)}</span>,
                ],
              };
            })}
            empty="Hasn’t worked on a job"
          />
        </v2.Card>

        <v2.Card title={`${first}’s activity`} sub="Everything that has happened to them, newest first.">
          <ol className="wp3-tl">
            {timeline.map((e, i) => (
              <li key={i} className={`t-${e.tone}`}>
                <span>
                  <b>{e.label}</b>
                  {e.detail ? (
                    <>
                      {' · '}
                      {e.href ? <Link href={e.href}>{e.detail}</Link> : <span>{e.detail}</span>}
                    </>
                  ) : e.href ? (
                    <>
                      {' · '}
                      <Link href={e.href}>open</Link>
                    </>
                  ) : null}
                </span>
                <small>{istDateTime(e.at)}</small>
              </li>
            ))}
          </ol>
        </v2.Card>
      </div>

      <div className="wp3-stack">
        {u.deletion ? null : (
          <>
            <v2.Card title="Looked after by" sub={crm.owner ? crm.owner.name : 'Nobody yet. Pick someone to keep in touch with this customer.'}>
              <Lock area="people">
                <OwnerForm userId={u.id} current={crm.owner?.id ?? null} staff={crm.staff} />
              </Lock>
            </v2.Card>

            <v2.Card title="Tags" sub="Labels only staff see. Use them to group people, then message or export the group.">
              {crm.tags.length ? (
                <ul className="wp3-taglist">
                  {crm.tags.map((t) => (
                    <li key={t.id}>
                      <TagChip tag={t} />
                      <Lock area="people">
                        <MiniButton action={removeTag} hidden={{ userId: u.id, tagId: t.id }} title={`Remove tag “${t.name}”`}>
                          ✕
                        </MiniButton>
                      </Lock>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small v2-muted">No tags.</p>
              )}
              <Lock area="people">
                <TagForm userId={u.id} suggestions={crm.allTags.filter((t) => !crm.tags.some((x) => x.id === t.id)).map((t) => t.name)} />
              </Lock>
            </v2.Card>

            <v2.Card title={`Message ${first}`} sub="Goes to their TaskDrop notifications, and a push on their phone." id="message">
              <Lock area="people">
                <BroadcastForm audiences={[]} fixedPerson={{ id: u.id, name: u.name }} />
              </Lock>
              <p className="small wp3-subhead">Sent to {first}</p>
              {crm.messages.length ? (
                <ul className="wp3-list">
                  {crm.messages.map((m) => (
                    <li key={m.id}>
                      <span>
                        <b>{m.title}</b> · “{m.body}”
                        <span className="small v2-muted block">
                          {m.by} · {istDateTime(m.at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small v2-muted">Nothing sent yet.</p>
              )}
            </v2.Card>
          </>
        )}

        <v2.Card title="Contact">
          {u.contactKnown ? (
            <v2.KV
              rows={[
                ['Phone', u.phone ? (u.contactsMasked ? u.phone : phone(u.phone)) : '—'],
                ['Email', u.email ?? '—'],
                ...(u.bio ? ([['Bio', `“${u.bio}”`]] as [ReactNode, ReactNode][]) : []),
              ]}
            />
          ) : (
            <v2.SetupNotice what="Phone and email need the server key." detail="SUPABASE_SERVICE_ROLE_KEY" />
          )}
          {u.contactKnown ? (
            <p className="small v2-muted wp3-mt">
              {u.contactsMasked ? 'Partly hidden. Full phone and email are shown to Admin and Support only.' : 'Shown in full for Admin and Support. Opening this page was written to the audit log.'}
            </p>
          ) : null}
        </v2.Card>

        <v2.Card title="Ratings">
          <v2.Grid cols={2}>
            <v2.Tile small label="As a worker" value={u.workerReviews ? `${u.workerRating.toFixed(1)}★` : '—'} foot={u.workerReviews ? `${u.workerReviews} reviews` : 'No reviews'} />
            <v2.Tile small label="As a poster" value={u.posterReviews ? `${u.posterRating.toFixed(1)}★` : '—'} foot={u.posterReviews ? `${u.posterReviews} reviews` : 'No reviews'} />
          </v2.Grid>
          {u.reviews.length ? (
            <ul className="wp3-list wp3-mt">
              {u.reviews.map((r, i) => (
                <li key={i}>
                  <span className="small">
                    <b>{'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))}</b> {r.author} · as {r.aboutRole}
                    {r.comment ? <> · “{r.comment}”</> : null}
                  </span>
                  <Link href={`/tasks/${r.taskId}`} className="small">
                    Job →
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </v2.Card>

        {hideMoney ? null : (
          <v2.Card title="Withdrawals" sub="Click one to see it, or pay it if it is waiting." id="withdrawals">
            {u.payouts.length ? (
              <ul className="wp3-list">
                {u.payouts.map((p) => {
                  const st = payoutStatus(p.status, first);
                  return (
                    <li key={p.id}>
                      <Link href={`/payouts/${p.id}`} className="wp3-spread wp3-link">
                        <span>
                          <b>{inr(p.amount_minor)}</b>
                          <span className="small v2-muted block">
                            {istDateTime(p.updated_at)}
                            {p.reference ? ` · ref ${p.reference}` : ''}
                            {p.failure_note ? ` · ${p.failure_note}` : ''}
                          </span>
                        </span>
                        <v2.Pill tone={TONE[st.tone]}>{st.label}</v2.Pill>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="small v2-muted">Never withdrawn.</p>
            )}
          </v2.Card>
        )}

        <v2.Card
          title={
            <>
              Warnings <v2.NewTag />
            </>
          }
          sub="Warnings staff sent them. They read each one in their notifications."
        >
          {warnings.setup ? (
            <v2.SetupNotice what="Warnings" />
          ) : warnings.rows.length ? (
            <ul className="wp3-list">
              {warnings.rows.map((w) => (
                <li key={w.id}>
                  <span className="small">
                    <b>“{w.reason}”</b>
                    <span className="v2-muted block">
                      by {w.by} · {istDateTime(w.at)}
                      {w.fromReport ? ' · from a flagged-content report' : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small v2-muted">None.</p>
          )}
        </v2.Card>

        <v2.Card title="Past suspensions">
          {crm.suspensionHistory.length ? (
            <ul className="wp3-list">
              {crm.suspensionHistory.map((s) => (
                <li key={s.id}>
                  <span className="small">
                    <b>“{s.reason}”</b>
                    <span className="v2-muted block">
                      by {s.by} · {istDate(s.at)} · lifted {s.liftedAt ? istDate(s.liftedAt) : ''}
                      {s.liftedBy ? ` by ${s.liftedBy}` : ''}
                      {s.liftNote ? ` · note: “${s.liftNote}”` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small v2-muted">None.</p>
          )}
        </v2.Card>

        {u.deletion || hideMoney ? null : (
          <v2.Card title="Delete account" sub="When someone asks through support, or to close an account for good.">
            {u.deletionBlockers.length ? (
              <>
                <p className="small">
                  <b>Can’t delete it yet:</b>
                </p>
                <ul className="small wp3-ul">
                  {u.deletionBlockers.map((b) => (
                    <li key={b.code}>{BLOCKER_FOR_ADMIN[b.code]?.(first) ?? b.message}</li>
                  ))}
                </ul>
              </>
            ) : (
              <Confirm
                action={deleteAccount}
                hidden={{ userId: u.id, name: first }}
                label="Delete account"
                tier={3}
                area="admin"
                tone="danger"
                small
                title={`Delete ${u.name}’s account?`}
                body={
                  <ul>
                    <li>{first} is signed out everywhere and their name, photo, contact details, saved payout details and sign-in methods are removed.</li>
                    <li>Jobs that went ahead, payments and withdrawals stay, shown as “Deleted user”, as the law requires.</li>
                    <li>
                      <b>This can’t be undone.</b> Their phone number or Google account would make a new, empty account if used again.
                    </li>
                  </ul>
                }
                reason={{ label: 'Why? (kept on record)', placeholder: 'e.g. asked by email on 6 Oct' }}
                word="DELETE"
                confirmLabel="Delete account"
              />
            )}
          </v2.Card>
        )}
        <p className="small v2-muted">
          Person id <span className="v2-mono">{u.id}</span>
        </p>
      </div>
    </v2.Grid>
  );
}

function Corrections({ u }: { u: UserDetail }) {
  return (
    <>
      <p className="small wp3-subhead">Manual corrections</p>
      {u.adjustments.length ? (
        <ul className="wp3-list">
          {u.adjustments.map((x, i) => (
            <li key={i}>
              <span className="small">
                {x.reason}
                <span className="v2-muted block">{istDateTime(x.createdAt)}</span>
              </span>
              <b className={x.deltaMinor < 0 ? 'wp3-neg' : undefined}>
                {x.deltaMinor > 0 ? '+' : ''}
                {inr(x.deltaMinor)}
              </b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small v2-muted">None.</p>
      )}
    </>
  );
}

function paymentStatus(status: string): { label: string; tone: v2.Tone } {
  if (status === 'paid') return { label: 'Paid', tone: 'ok' };
  if (status === 'failed') return { label: 'Failed', tone: 'danger' };
  if (status === 'cancelled') return { label: 'Cancelled', tone: 'mut' };
  return { label: 'Waiting', tone: 'wait' };
}

function MoneyTab({ u, payments, settings }: { u: UserDetail; payments: UserPayment[] | null; settings: MoneySettings }) {
  const paidIn = (payments ?? []).filter((p) => p.status === 'paid').reduce((s, p) => s + p.amountMinor, 0);
  const withdrawn = u.payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount_minor, 0);
  return (
    <>
      <v2.Grid cols={4} className="wp3-keep2">
        <v2.Tile tone="blue" label="Ready to withdraw" value={inr(u.walletMinor)} />
        <v2.Tile label="Still clearing" value={inr(u.clearingMinor)} foot={`withdrawable ${settings.clearingDays} days after approval`} />
        <v2.Tile label="Paid in" value={payments ? inr(paidIn) : '—'} foot="shown payments" />
        <v2.Tile label="Withdrawn" value={inr(withdrawn)} foot="shown withdrawals" />
      </v2.Grid>
      <v2.Grid cols="main" className="wp3-mt">
        <v2.Card title="Payments in" sub="Funding a job or topping up. The latest 50.">
          {payments === null ? (
            <v2.SetupNotice what="Their payments need the server key." detail="SUPABASE_SERVICE_ROLE_KEY" />
          ) : (
            <v2.DataTable
              columns={[{ label: 'When' }, { label: 'For' }, { label: 'Status' }, { label: 'Amount', right: true }]}
              rows={payments.map((p) => {
                const st = paymentStatus(p.status);
                return {
                  key: p.id,
                  cells: [
                    <span key="w" className="small nowrap">{istDateTime(p.paidAt ?? p.createdAt)}</span>,
                    p.purpose === 'escrow' ? (
                      p.taskId ? (
                        <Link key="f" href={`/tasks/${p.taskId}`}>
                          Funding a job
                        </Link>
                      ) : (
                        'Funding a job'
                      )
                    ) : (
                      'Wallet top-up'
                    ),
                    <v2.Pill key="s" tone={st.tone}>{st.label}</v2.Pill>,
                    inr(p.amountMinor),
                  ],
                };
              })}
              empty="No payments in"
            />
          )}
        </v2.Card>
        <v2.Card title="Manual corrections" sub="Changes an admin made to their wallet.">
          <Corrections u={u} />
        </v2.Card>
      </v2.Grid>
    </>
  );
}

function FollowUpsTab({ userId, items, staff, me, now }: { userId: string; items: Read<FollowUp[]>; staff: { id: string; name: string }[]; me: string; now: Date }) {
  if (items.setup) return <v2.SetupNotice what="Follow-ups" />;
  return (
    <v2.Grid cols="main">
      <v2.Card title="Follow-ups about this person">
        {items.error ? <v2.ErrorState detail={items.error} /> : null}
        <v2.DataTable
          columns={[{ label: 'What' }, { label: 'Owner' }, { label: 'Due' }, { label: 'Done by' }, { label: '' }]}
          rows={items.data.map((f) => {
            const done = f.status === 'done';
            const overdue = !done && f.dueAt && new Date(f.dueAt).getTime() < now.getTime();
            return {
              key: f.id,
              cells: [
                <span key="w">
                  <b>{f.title}</b>
                  {f.detail ? <span className="small v2-muted block">{f.detail}</span> : null}
                </span>,
                f.owner,
                f.dueAt ? overdue ? <v2.Pill key="d" tone="danger">Overdue · {istDate(f.dueAt)}</v2.Pill> : <span key="d" className="small">{istDateTime(f.dueAt)}</span> : '—',
                done ? f.completedBy ?? 'Done' : '—',
                <Lock key="a" area="people">
                  <FinishButton taskId={f.id} reopen={done} />
                </Lock>,
              ],
            };
          })}
          empty="No follow-ups. Add one on the right."
        />
      </v2.Card>
      <v2.Card title="Add a follow-up">
        <Lock area="people">
          <FollowUpForm staff={staff} me={me} userId={userId} />
        </Lock>
      </v2.Card>
    </v2.Grid>
  );
}

function DevicesTab({ u, now, list, signIn, canSignOut }: { u: UserDetail; now: Date; list: UserDevice[] | null; signIn: UserSignIn | null; canSignOut: boolean }) {
  const first = u.name.split(' ')[0] ?? u.name;
  return (
    <v2.Grid cols="main">
      <v2.Card title="Devices" sub="Installs this person has used, newest first. App version and system show once they open a build that reports them.">
        {list === null ? (
          <v2.SetupNotice what="Their devices need the server key." detail="SUPABASE_SERVICE_ROLE_KEY" />
        ) : (
          <v2.DataTable
            columns={[{ label: 'Platform' }, { label: 'App version' }, { label: 'Phone or browser' }, { label: 'First seen' }, { label: 'Last active' }]}
            rows={list.map((d, i) => ({
              key: String(i),
              cells: [
                PLATFORM_LABEL[d.platform] ?? d.platform,
                d.appVersion ? <span key="v" className="v2-mono">{d.appVersion}</span> : <span key="v" className="v2-muted">Not reported</span>,
                d.osVersion ?? '—',
                <span key="f" className="small nowrap">{istDateTime(d.registeredAt)}</span>,
                <span key="l" className="small nowrap">{timeAgo(d.lastSeenAt, now)}</span>,
              ],
            }))}
            empty="No device has reported in or allowed notifications"
          />
        )}
      </v2.Card>
      <v2.Card title="Sign-in" sub="How this person can get into their account.">
        {signIn === null ? (
          <v2.SetupNotice what="Sign-in methods need the server key." detail="SUPABASE_SERVICE_ROLE_KEY" />
        ) : (
          <>
            <v2.KV
              rows={[
                ['Signs in with', signIn.methods.length ? signIn.methods.join(' · ') : 'No sign-in method found'],
                ['Last signed in', signIn.lastSignInAt ? istDateTime(signIn.lastSignInAt) : 'Has not signed in yet'],
              ]}
            />
            {canSignOut && !u.deletion ? (
              <div className="wp3-mt">
                <Confirm
                  action={signOutEverywhere}
                  hidden={{ userId: u.id, name: first }}
                  label="Sign out everywhere"
                  tier={2}
                  area="admin"
                  tone="warn"
                  title={`Sign ${u.name} out on every device?`}
                  body={<p>Ends all of their sessions. They can sign in again with the same method. A phone or browser that is already open stops working on its next request. Nothing else about the account changes.</p>}
                  reason={{ label: 'Why', placeholder: 'e.g. lost phone, asked by support' }}
                  confirmLabel="Sign out everywhere"
                />
              </div>
            ) : null}
          </>
        )}
      </v2.Card>
    </v2.Grid>
  );
}

function AuditTab({ entries }: { entries: UserAuditEntry[] }) {
  return (
    <v2.Card title="Admin actions on this person" sub="From the audit log. Newest first, the latest 50.">
      <v2.DataTable
        columns={[{ label: 'When' }, { label: 'Who' }, { label: 'What' }]}
        rows={entries.map((e) => ({
          key: String(e.id),
          cells: [
            <span key="w" className="small nowrap">{istDateTime(e.at)}</span>,
            e.actor,
            <span key="a">
              {e.action}
              {e.detail ? <span className="small v2-muted block">{e.detail}</span> : null}
            </span>,
          ],
        }))}
        empty="Nothing recorded"
      />
    </v2.Card>
  );
}
