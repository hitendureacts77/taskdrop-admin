import Link from 'next/link';
import type { PersonCrm, TimelineEvent } from '@/lib/crm';
import { ClickCard, ClickRow } from '../Clickable';
import type { MoneySettings, UserDetail } from '@/lib/data';
import { istDate, istDateTime, phone, timeAgo } from '@/lib/format';
import { initials, payoutStatus, taskStatus } from '@/lib/labels';
import { Card, Empty, JobLink, KV, Money, PageHeader, Pill } from '../ui';
import {
  DeleteAccountCard,
  DeletedBanner,
  MessageCard,
  NotesCard,
  SuspendButton,
  SuspensionBanner,
  SuspensionHistory,
  TagChip,
  TagsCard,
  TimelineCard,
} from './PersonCrm';

export function UserView({
  u,
  settings,
  now: nowIso,
  crm,
  timeline,
}: {
  u: UserDetail;
  settings: MoneySettings;
  now: string;
  crm: PersonCrm;
  timeline: TimelineEvent[];
}) {
  const now = new Date(nowIso);
  const first = u.name.split(' ')[0] ?? u.name;

  return (
    <>
      <PageHeader
        right={u.deletion ? null : <SuspendButton userId={u.id} name={u.name} isAdmin={u.roles.includes('admin')} crm={crm} />}
        crumbs={[{ href: '/users', label: 'People' }, { label: u.name }]}
        title={
          <span className="person person-lg">
            <span className="avatar avatar-lg" aria-hidden="true">
              {initials(u.name)}
            </span>
            <span>{u.name}</span>
          </span>
        }
        sub={
          <span className="pill-row">
            {u.roles.includes('admin') ? <Pill tone="gold">Admin</Pill> : null}
            {u.isWorker ? <Pill tone="blue">Worker</Pill> : null}
            <Pill tone="grey">Poster</Pill>
            {u.availableNow ? <Pill tone="green">Available now</Pill> : null}
            {u.deletion ? <Pill tone="grey">Deleted</Pill> : null}
            {crm.suspension ? <Pill tone="red">Suspended</Pill> : null}
            {crm.tags.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
            <span className="muted">
              {u.username ? `@${u.username} · ` : ''}
              {u.place ? `${u.place} · ` : ''}joined {istDate(u.joinedAt)}
              {u.lastSeenAt ? ` · last seen ${timeAgo(u.lastSeenAt, now)}` : ''}
            </span>
          </span>
        }
      />

      {u.deletion ? <DeletedBanner deletion={u.deletion} /> : <SuspensionBanner userId={u.id} name={u.name} crm={crm} />}

      <div className="grid-main-side">
        <div className="stack">
          <Card title={`${first}’s wallet`} sub="Money TaskDrop holds for this person. It is theirs, not TaskDrop’s.">
            <div className="figures">
              <ClickCard className="figure" href="#withdrawals">
                <span className="figure-label">Ready to withdraw</span>
                <Money minor={u.walletMinor} className="figure-num" />
                <span className="muted small">They can ask for this any time.</span>
                <a href="#withdrawals" className="figure-link">
                  Their withdrawals →
                </a>
              </ClickCard>
              <div className="figure">
                <span className="figure-label">Still clearing</span>
                <Money minor={u.clearingMinor} className="figure-num" />
                <span className="muted small">From approved jobs. Withdrawable {settings.clearingDays} days after approval.</span>
              </div>
            </div>
            {u.adjustments.length ? (
              <>
                <h3 className="sub-head">Manual corrections</h3>
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
              </>
            ) : null}
          </Card>

          <NotesCard userId={u.id} crm={crm} now={now} />

          <Card title={`Jobs ${first} posted`} flush>
            {u.posted.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="th">Job</th>
                      <th className="th">Status</th>
                      <th className="th num">Price</th>
                      <th className="th">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.posted.map((t) => {
                      const st = taskStatus(t.status);
                      return (
                        <ClickRow key={t.id} href={`/tasks/${t.id}`}>
                          <td className="td">
                            <JobLink id={t.id} title={t.title} />
                          </td>
                          <td className="td">
                            <Pill tone={st.tone}>{st.label}</Pill>
                          </td>
                          <td className="td num">{t.priceMinor !== null ? <Money minor={t.priceMinor} /> : '—'}</td>
                          <td className="td nowrap">{istDate(t.createdAt)}</td>
                        </ClickRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Hasn’t posted a job" />
            )}
          </Card>

          <Card title={`Jobs ${first} worked on`} flush>
            {u.worked.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="th">Job</th>
                      <th className="th">Status</th>
                      <th className="th num">Poster paid</th>
                      <th className="th">Hired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.worked.map((t) => {
                      const st = taskStatus(t.status);
                      return (
                        <ClickRow key={t.id} href={`/tasks/${t.id}`}>
                          <td className="td">
                            <JobLink id={t.id} title={t.title} />
                          </td>
                          <td className="td">
                            <Pill tone={st.tone}>{st.label}</Pill>
                          </td>
                          <td className="td num">
                            <Money minor={t.escrowMinor} />
                          </td>
                          <td className="td nowrap">{istDate(t.createdAt)}</td>
                        </ClickRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Hasn’t worked on a job" />
            )}
          </Card>

          <TimelineCard events={timeline} first={first} />
        </div>

        <div className="stack">
          {u.deletion ? null : (
            <>
              <TagsCard userId={u.id} crm={crm} />
              <MessageCard userId={u.id} name={u.name} crm={crm} />
            </>
          )}
          <Card title="Contact">
            {u.contactKnown ? (
              <KV
                rows={[
                  { label: 'Phone', value: u.phone ? phone(u.phone) : <span className="muted">—</span> },
                  { label: 'Email', value: u.email ?? <span className="muted">—</span> },
                ]}
              />
            ) : (
              <p className="muted small">Phone and email need SUPABASE_SERVICE_ROLE_KEY on the server.</p>
            )}
            {u.bio ? <p className="prose small">{u.bio}</p> : null}
          </Card>

          <Card title="Ratings">
            <KV
              rows={[
                { label: 'As a worker', value: u.workerReviews ? `★ ${u.workerRating.toFixed(1)} from ${u.workerReviews}` : <span className="muted">No reviews</span> },
                { label: 'As a poster', value: u.posterReviews ? `★ ${u.posterRating.toFixed(1)} from ${u.posterReviews}` : <span className="muted">No reviews</span> },
              ]}
            />
            {u.reviews.length ? (
              <ul className="plain-list">
                {u.reviews.map((r, i) => (
                  <ClickCard as="li" key={i} href={`/tasks/${r.taskId}`}>
                    <span>
                      <strong>{'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))}</strong> from {r.author}, as {r.aboutRole}
                      {r.comment ? <span className="small block">“{r.comment}”</span> : null}
                    </span>
                    <JobLink id={r.taskId} title="Job" />
                  </ClickCard>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card title="Withdrawals" sub="Click one to see it, or pay it if it is waiting." id="withdrawals">
            {u.payouts.length ? (
              <ul className="plain-list">
                {u.payouts.map((p) => {
                  const st = payoutStatus(p.status, first);
                  return (
                    <ClickCard as="li" key={p.id} href={`/payouts/${p.id}`}>
                      <span>
                        <Link href={`/payouts/${p.id}`}>
                          <Pill tone={st.tone}>{st.label}</Pill>
                        </Link>
                        <span className="muted small block">
                          {istDateTime(p.updated_at)}
                          {p.reference ? ` · ref ${p.reference}` : ''}
                          {p.failure_note ? ` · ${p.failure_note}` : ''}
                        </span>
                      </span>
                      <Money minor={p.amount_minor} />
                    </ClickCard>
                  );
                })}
              </ul>
            ) : (
              <p className="muted small">Never withdrawn.</p>
            )}
          </Card>
          <SuspensionHistory crm={crm} />
          {u.deletion ? null : <DeleteAccountCard userId={u.id} name={u.name} blockers={u.deletionBlockers} />}
          <p className="muted small">Person id {u.id}</p>
        </div>
      </div>
    </>
  );
}
