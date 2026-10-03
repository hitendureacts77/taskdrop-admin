import Link from 'next/link';
import type { DisputeRow, RefundOwed, TicketDetail, TicketRow } from '@/lib/data';
import { inr, istDateTime, timeAgo } from '@/lib/format';
import { TICKET_STATUS } from '@/lib/labels';
import { ConfirmAction, type FormAction } from '../ConfirmAction';
import { CopyButton } from '../CopyButton';
import { ReplyBox } from '../ReplyBox';
import { Card, Empty, HowItWorks, JobLink, Money, Notice, PageHeader, PersonLink, Pill, Tabs } from '../ui';

// ---------------------------------------------------------------- disputes --

export function DisputesView({ rows, now: nowIso }: { rows: DisputeRow[]; now: string }) {
  const now = new Date(nowIso);
  const frozen = rows.filter((r) => r.funded).reduce((a, r) => a + r.escrowMinor, 0);
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Disputes' }]}
        title="Disputes"
        sub="Jobs where the poster and the worker disagree. The money stays frozen until you decide."
      />
      <HowItWorks
        steps={[
          <>Open the job and read what was asked, the quotes, the timeline and any reviews.</>,
          <>
            <strong>Pay the worker</strong> if the work was done: they get their share and TaskDrop keeps its commission.
          </>,
          <>
            <strong>Refund the poster</strong> if it wasn’t: the job is cancelled and everything they paid, service fee included, goes straight back to their
            TaskDrop wallet. (An older job paid by card shows up in <Link href="/refunds">Refunds</Link> instead.)
          </>,
        ]}
      />
      <Card
        title={`${rows.length} open dispute${rows.length === 1 ? '' : 's'}`}
        sub={
          rows.length ? (
            <>
              <Money minor={frozen} /> frozen in escrow. Oldest first.
            </>
          ) : undefined
        }
        flush
      >
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Job</th>
                  <th className="th">Poster</th>
                  <th className="th">Worker</th>
                  <th className="th num">Frozen</th>
                  <th className="th">Waiting</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.taskId}>
                    <td className="td">
                      <JobLink id={r.taskId} title={r.title} />
                    </td>
                    <td className="td">
                      <PersonLink id={r.posterId} name={r.poster} />
                    </td>
                    <td className="td">{r.workerId ? <PersonLink id={r.workerId} name={r.worker} /> : '—'}</td>
                    <td className="td num">{r.funded ? <Money minor={r.escrowMinor} /> : <span className="muted">Never paid</span>}</td>
                    <td className="td nowrap">{timeAgo(r.since, now)}</td>
                    <td className="td">
                      <Link className="btn btn-primary btn-small" href={`/tasks/${r.taskId}`}>
                        Decide
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No disputes">When a poster or worker raises one, it shows up here.</Empty>
        )}
      </Card>
    </>
  );
}

// ----------------------------------------------------------------- refunds --

export function RefundsView({ rows, sendRefund }: { rows: RefundOwed[] | null; sendRefund: FormAction }) {
  const owed = (rows ?? []).reduce((a, r) => a + r.dueMinor, 0);
  return (
    <>
      <PageHeader crumbs={[{ label: 'Refunds' }]} title="Refunds" sub="Posters’ money from cancelled jobs that still has to go back to them." />
      {rows === null ? (
        <Notice tone="gold" title="This list needs the server key">
          Refunds owed are kept in a view that only the server can read. Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to the admin app’s environment (never with a
          NEXT_PUBLIC_ prefix) and reload.
        </Notice>
      ) : (
        <>
          <HowItWorks
            steps={[
              <>When a paid job is cancelled, the poster is owed what they paid, minus anything already paid to the worker for their time.</>,
              <>
                <strong>Send refund</strong> asks Razorpay to return it to the card or UPI the poster paid with. The amount is worked out by the database, not typed in.
              </>,
              <>It is only marked refunded after Razorpay accepts it. Money usually reaches the poster in 5–7 working days.</>,
            ]}
          />
          <Card
            title={`${rows.length} refund${rows.length === 1 ? '' : 's'} owed`}
            sub={rows.length ? <><Money minor={owed} /> in total. Oldest first.</> : undefined}
            flush
          >
            {rows.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="th">Job</th>
                      <th className="th">Poster</th>
                      <th className="th num">Paid</th>
                      <th className="th num">Kept for worker</th>
                      <th className="th num">Owed back</th>
                      <th className="th">Cancelled</th>
                      <th className="th">Razorpay payment</th>
                      <th className="th" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.taskId}>
                        <td className="td">
                          <JobLink id={r.taskId} title={r.title} />
                        </td>
                        <td className="td">
                          <PersonLink id={r.posterId} name={r.poster} />
                        </td>
                        <td className="td num">
                          <Money minor={r.paidMinor} />
                        </td>
                        <td className="td num">
                          <Money minor={r.penaltyMinor} />
                        </td>
                        <td className="td num">
                          <strong>
                            <Money minor={r.dueMinor} />
                          </strong>
                        </td>
                        <td className="td nowrap">{r.cancelledAt ? istDateTime(r.cancelledAt) : '—'}</td>
                        <td className="td small">
                          {r.providerPaymentId ? (
                            <>
                              <code>{r.providerPaymentId}</code> <CopyButton value={r.providerPaymentId} label="payment id" />
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="td">
                          <ConfirmAction
                            action={sendRefund}
                            hidden={{ taskId: r.taskId, poster: r.poster }}
                            trigger="Send refund"
                            title={`Refund ${inr(r.dueMinor)} to ${r.poster}?`}
                            consequence={
                              <>
                                Razorpay sends {inr(r.dueMinor)} back to the card or UPI {r.poster} paid with.
                                {r.penaltyMinor > 0 ? ` The worker keeps the ${inr(r.penaltyMinor)} already paid to them for their time.` : ''} This can’t be undone.
                              </>
                            }
                            confirmLabel={`Yes, refund ${inr(r.dueMinor)}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Nothing owed">Every cancelled job has been refunded.</Empty>
            )}
          </Card>
        </>
      )}
    </>
  );
}

// ----------------------------------------------------------------- support --

export function SupportView({ rows, status, now: nowIso }: { rows: TicketRow[]; status: string; now: string }) {
  const now = new Date(nowIso);
  const tabs = [
    { key: 'waiting', label: 'Waiting for a reply' },
    { key: 'answered', label: 'Answered' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all', label: 'All' },
  ];
  return (
    <>
      <PageHeader crumbs={[{ label: 'Help requests' }]} title="Help requests" sub="Questions and problems people sent from the app. Open one to read it and reply." />
      <Tabs label="Show" items={tabs.map((t) => ({ href: t.key === 'waiting' ? '/support' : `/support?status=${t.key}`, label: t.label, active: t.key === status }))} />
      <Card title={`${rows.length} conversation${rows.length === 1 ? '' : 's'}`} flush>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Subject</th>
                  <th className="th">From</th>
                  <th className="th">About</th>
                  <th className="th">Status</th>
                  <th className="th">Last message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const st = TICKET_STATUS[t.status] ?? { label: t.status, tone: 'grey' as const };
                  return (
                    <tr key={t.id}>
                      <td className="td">
                        <Link href={`/support/${t.id}`} className="job-link">
                          {t.subject}
                        </Link>
                      </td>
                      <td className="td">
                        <PersonLink id={t.userId} name={t.user} />
                      </td>
                      <td className="td">{t.category}</td>
                      <td className="td">
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </td>
                      <td className="td nowrap muted">{timeAgo(t.updatedAt, now)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={status === 'waiting' ? 'Nobody is waiting for a reply' : 'Nothing here'} />
        )}
      </Card>
    </>
  );
}

export function TicketView({ t, reply, resolve }: { t: TicketDetail; reply: FormAction; resolve: FormAction }) {
  const st = TICKET_STATUS[t.status] ?? { label: t.status, tone: 'grey' as const };
  return (
    <>
      <PageHeader
        crumbs={[{ href: '/support', label: 'Help requests' }, { label: t.subject }]}
        title={t.subject}
        sub={
          <span className="head-meta">
            <Pill tone={st.tone}>{st.label}</Pill> From <PersonLink id={t.userId} name={t.user} /> · about {t.category}
            {t.page ? ` · sent from ${t.page}` : ''} · opened {istDateTime(t.createdAt)}
          </span>
        }
      />
      <Card title="Conversation">
        <ol className="thread">
          {t.messages.map((m) => (
            <li key={m.id} className={m.fromStaff ? 'from-staff' : 'from-user'}>
              <span className="thread-who">
                {m.author} · {istDateTime(m.createdAt)}
              </span>
              <p>{m.body}</p>
            </li>
          ))}
        </ol>
        {t.messages.length === 0 ? <p className="muted">No messages yet.</p> : null}
      </Card>
      <div className="grid-2">
        <Card title={`Reply to ${t.user}`} sub="They get a notification in the app.">
          <ReplyBox action={reply} ticketId={t.id} />
        </Card>
        <Card title="Done?" sub="Resolve it when there’s nothing left to do. They can still write back.">
          {t.status !== 'resolved' ? (
            <ConfirmAction
              action={resolve}
              hidden={{ ticketId: t.id }}
              trigger="Mark as resolved"
              tone="quiet"
              title="Mark this conversation as resolved?"
              consequence={<>It moves to the Resolved list. No money is involved.</>}
              confirmLabel="Mark resolved"
            />
          ) : (
            <p className="muted">Already resolved.</p>
          )}
        </Card>
      </div>
    </>
  );
}
