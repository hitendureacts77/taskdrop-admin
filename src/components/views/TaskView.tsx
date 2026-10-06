import Link from 'next/link';
import { ClickCard, ClickRow } from '../Clickable';
import type { ReactNode } from 'react';
import type { DisputeReason, MoneySettings, TaskDetail } from '@/lib/data';
import { inr, istDateTime, pct } from '@/lib/format';
import { ledgerKind, taskStatus } from '@/lib/labels';
import { ConfirmAction, type FormAction } from '../ConfirmAction';
import { Icon } from '../Icon';
import { Card, Empty, KV, Money, Notice, PageHeader, PersonLink, Pill } from '../ui';

const HOLDING = new Set(['assigned', 'started']);

export function TaskView({
  t,
  settings,
  now: nowIso,
  resolveDispute,
  dispute = null,
}: {
  t: TaskDetail;
  settings: MoneySettings;
  now: string;
  resolveDispute: FormAction;
  /** Why the job was reported, when it is in dispute and the report carried a reason. */
  dispute?: DisputeReason | null;
}) {
  const now = new Date(nowIso);
  const st = taskStatus(t.status);
  const a = t.assignment;
  const price = t.lockedMinor ?? t.budgetMinor;
  const escrow = a?.escrowMinor ?? null;
  const fee = escrow !== null && t.lockedMinor !== null ? Math.max(0, escrow - t.lockedMinor) : null;
  const bookedCommission = t.ledger.filter((l) => l.kind === 'worker_commission').reduce((s, l) => s + l.amount, 0);
  const bookedFee = t.ledger.filter((l) => l.kind === 'poster_fee').reduce((s, l) => s + l.amount, 0);
  const expectedNet = t.lockedMinor !== null ? Math.round(t.lockedMinor * (1 - settings.commissionPct)) : null;
  const commission = bookedCommission || (t.lockedMinor !== null && expectedNet !== null ? t.lockedMinor - expectedNet : 0);
  const workerNet = t.lockedMinor !== null ? t.lockedMinor - commission : null;
  const finished = t.status === 'COMPLETED' || t.status === 'AUTO_COMPLETED';
  const holding = Boolean(t.fundedAt && a && HOLDING.has(a.status));

  let whereNow: ReactNode;
  if (!a) whereNow = 'Nobody is hired yet, so no money is involved.';
  else if (!t.fundedAt) whereNow = `${a.worker} is hired, but ${t.poster} hasn’t paid yet. Nothing is held.`;
  else if (t.status === 'DISPUTED') whereNow = <>Frozen in escrow until an admin decides the dispute (below).</>;
  else if (holding) whereNow = <>Held by TaskDrop (escrow) since {istDateTime(t.fundedAt)}. It still belongs to {t.poster} until they approve the work.</>;
  else if (finished)
    whereNow = (
      <>
        Released{t.completedAt ? ` on ${istDateTime(t.completedAt)}` : ''}. {a.worker} got {workerNet !== null ? inr(workerNet) : 'their share'} in their TaskDrop wallet
        {t.clearedAt ? ' and can withdraw it' : t.clearAt ? `, withdrawable from ${istDateTime(t.clearAt)}` : ''}. TaskDrop kept {inr(bookedCommission + bookedFee)}.
      </>
    );
  else if (t.status === 'CANCELLED')
    whereNow =
      t.payment && t.payment.refundedMinor > 0 ? (
        <>Cancelled. {inr(t.payment.refundedMinor)} was refunded to {t.poster} through Razorpay.</>
      ) : t.fundedAt && t.payment ? (
        <>
          Cancelled. {t.poster} paid by card, so what they paid is owed back to that card or UPI. Send it from <Link href="/refunds">Refunds</Link>.
        </>
      ) : t.fundedAt ? (
        <>Cancelled. Everything {t.poster} paid, service fee included, went back to their TaskDrop wallet.</>
      ) : (
        'Cancelled before the poster paid, so no money was involved.'
      );
  else whereNow = '—';

  const timeline: { label: string; at: string | null; note?: string }[] = [
    { label: 'Posted', at: t.createdAt },
    { label: a ? `${a.worker} hired` : 'Worker hired', at: a?.createdAt ?? null },
    { label: `${t.poster} paid into escrow`, at: t.fundedAt },
    { label: 'Work started', at: t.startedAt },
    { label: 'Marked done by the worker', at: t.workDoneAt },
    ...(t.status === 'WORK_DONE' && t.autoCompleteAt ? [{ label: 'Releases on its own if the poster stays silent', at: null, note: istDateTime(t.autoCompleteAt) }] : []),
    { label: t.status === 'AUTO_COMPLETED' ? 'Approved automatically' : 'Approved, money released', at: t.completedAt },
    { label: 'Worker can withdraw', at: t.clearedAt, note: !t.clearedAt && t.clearAt ? `from ${istDateTime(t.clearAt)}` : undefined },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ href: '/tasks', label: 'Jobs' }, { label: t.title }]}
        title={t.title}
        sub={
          <span className="head-meta">
            <Pill tone={st.tone}>{st.label}</Pill> <span>{st.hint}</span>
          </span>
        }
      />

      {t.status === 'DISPUTED' ? (
        <Notice tone="red" icon="alert" title={dispute ? `Why it was reported${dispute.by ? ` · ${dispute.by}` : ''} · ${istDateTime(dispute.at)}` : 'Why it was reported'}>
          {dispute ? `“${dispute.reason}”` : 'No reason was recorded for this one. It was reported before reasons were kept.'}
        </Notice>
      ) : null}

      {t.status === 'DISPUTED' && a && !t.fundedAt ? (
        <Notice tone="gold" title="This dispute has no money to decide over">
          {t.poster} never paid for this job, so neither side can be paid out. It can only be cancelled.
        </Notice>
      ) : null}

      {t.status === 'DISPUTED' && a && t.fundedAt ? (
        <Card title="Decide this dispute" sub="Read the job, the quotes and the reviews first. Both choices are final.">
          <div className="decide">
            <div className="decide-option">
              <strong>The work stands: pay {a.worker}</strong>
              <p>
                {workerNet !== null ? inr(workerNet) : 'Their share'} goes into {a.worker}’s TaskDrop wallet, withdrawable after {settings.clearingDays} days. TaskDrop keeps{' '}
                {inr(commission)} commission{fee ? ` and the ${inr(fee)} service fee` : ''}. The job is marked finished.
              </p>
              <ConfirmAction
                action={resolveDispute}
                hidden={{ taskId: t.id, outcome: 'worker' }}
                trigger={`Pay ${a.worker}`}
                title={`Decide for ${a.worker}?`}
                consequence={
                  <>
                    {workerNet !== null ? inr(workerNet) : 'Their share'} goes to <strong>{a.worker}’s wallet</strong>. {t.poster} gets nothing back. This can’t be undone.
                  </>
                }
                field={{ name: 'note', label: 'Reason (saved with the decision)', placeholder: 'e.g. photos show the work was done' }}
                confirmLabel={`Yes, pay ${a.worker}`}
              />
            </div>
            <div className="decide-option">
              <strong>Refund {t.poster}</strong>
              <p>
                {escrow !== null ? inr(escrow) : 'The money held'} goes back to {t.poster}’s TaskDrop wallet, service fee included. {a.worker} gets nothing, TaskDrop
                earns nothing, and the job is cancelled. (A job paid by card before wallets existed appears under <Link href="/refunds">Refunds</Link> instead.)
              </p>
              <ConfirmAction
                action={resolveDispute}
                hidden={{ taskId: t.id, outcome: 'poster' }}
                trigger={`Refund ${t.poster}`}
                tone="danger"
                title={`Decide for ${t.poster}?`}
                consequence={
                  <>
                    The job is cancelled and {escrow !== null ? inr(escrow) : 'the money held'} goes back to <strong>{t.poster}</strong>’s TaskDrop wallet, fee
                    included. {a.worker} is paid nothing. This can’t be undone.
                  </>
                }
                field={{ name: 'note', label: 'Reason (saved with the decision)', placeholder: 'e.g. work was not done' }}
                confirmLabel={`Yes, refund ${t.poster}`}
              />
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid-main-side">
        <div className="stack">
          <Card title="The money for this job">
            <KV
              rows={[
                { label: t.lockedMinor !== null ? 'Agreed price' : 'Poster’s budget', value: <Money minor={price} />, hint: t.lockedMinor !== null ? 'The quote the poster accepted' : 'No quote accepted yet' },
                ...(!t.fundedAt && a ? [{ label: 'Paid by the poster', value: <span className="muted">Not yet</span>, hint: 'Nothing is held for this job' }] : []),
                ...(fee !== null && t.fundedAt ? [{ label: 'Service fee paid by the poster', value: <Money minor={fee} />, hint: `${pct(settings.posterFeePct)} on top of the price` }] : []),
                ...(escrow !== null && t.fundedAt ? [{ label: 'Poster paid in total', value: <Money minor={escrow} />, strong: true }] : []),
                ...(workerNet !== null && a && t.fundedAt ? [{ label: `${a.worker} gets`, value: <Money minor={workerNet} />, hint: `${pct(1 - settings.commissionPct)} of the price` }] : []),
                ...(t.lockedMinor !== null && t.fundedAt
                  ? [
                      {
                        label: finished ? 'TaskDrop earned' : 'TaskDrop will earn',
                        value: <Money minor={finished ? bookedCommission + bookedFee : commission + (fee ?? 0)} />,
                        hint: `${pct(settings.commissionPct)} commission${fee ? ' + service fee' : ''}`,
                      },
                    ]
                  : []),
              ]}
            />
            <Notice tone={t.status === 'DISPUTED' ? 'red' : holding ? 'blue' : 'green'} icon={t.status === 'DISPUTED' ? 'alert' : holding ? 'shield' : 'money'} title="Where the money is now">
              {whereNow}
            </Notice>
            {t.payment ? (
              <p className="muted small">
                Razorpay payment {t.payment.providerPaymentId ?? '—'} · {t.payment.status}
                {t.payment.refundedMinor ? ` · ${inr(t.payment.refundedMinor)} refunded` : ''}
              </p>
            ) : null}
          </Card>

          <Card title="What the poster asked for">
            <p className="prose">{t.description || <span className="muted">No description.</span>}</p>
            <p className="muted small">{[t.category, t.place, t.kind].filter(Boolean).join(' · ')}</p>
          </Card>

          <Card title={`Quotes (${t.quotes.length})`} flush>
            {t.quotes.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="th">Worker</th>
                      <th className="th num">Price</th>
                      <th className="th">Message</th>
                      <th className="th">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.quotes.map((q) => (
                      <ClickRow key={q.id} href={`/users/${q.workerId}`}>
                        <td className="td">
                          <PersonLink id={q.workerId} name={q.worker} /> {q.chosen ? <Pill tone="green">Chosen</Pill> : null}
                        </td>
                        <td className="td num">
                          <Money minor={q.priceMinor} />
                        </td>
                        <td className="td small">{q.message ?? '—'}</td>
                        <td className="td nowrap muted">{istDateTime(q.createdAt)}</td>
                      </ClickRow>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No quotes yet" />
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title="People">
            <KV
              rows={[
                { label: 'Poster', value: <PersonLink id={t.posterId} name={t.poster} /> },
                { label: 'Worker', value: a ? <PersonLink id={a.workerId} name={a.worker} /> : <span className="muted">Not hired</span> },
              ]}
            />
          </Card>

          <Card title="Timeline">
            <ol className="timeline">
              {timeline.map((s, i) => (
                <li key={i} className={s.at ? 'done' : 'todo'}>
                  <span className="tl-dot" aria-hidden="true">
                    {s.at ? <Icon name="check" size={12} /> : null}
                  </span>
                  <span>
                    <strong>{s.label}</strong>
                    <span className="muted small block">{s.at ? istDateTime(s.at) : s.note ?? 'Not yet'}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="TaskDrop’s earnings from this job">
            {t.ledger.length ? (
              <ul className="plain-list">
                {t.ledger.map((l) => (
                  <ClickCard as="li" key={l.id} href={`/money/entries?when=all&kind=${l.kind}`}>
                    <span>
                      {ledgerKind(l.kind).label}
                      <span className="muted small block">{istDateTime(l.at)}</span>
                    </span>
                    <Money minor={l.amount} />
                  </ClickCard>
                ))}
              </ul>
            ) : (
              <p className="muted small">Nothing booked yet. TaskDrop earns when the poster approves the work.</p>
            )}
          </Card>

          {t.reviews.length ? (
            <Card title="Reviews">
              <ul className="plain-list">
                {t.reviews.map((r, i) => (
                  <li key={i}>
                    <span>
                      <strong>{'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))}</strong> by {r.author} about the {r.aboutRole}
                      {r.comment ? <span className="small block">“{r.comment}”</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <p className="small">
            <Link href={`/tasks?q=${encodeURIComponent(t.title.slice(0, 30))}`}>Find similar jobs →</Link>
          </p>
          <p className="muted small">Job id {t.id} · checked {istDateTime(now.toISOString())}</p>
        </div>
      </div>
    </>
  );
}
