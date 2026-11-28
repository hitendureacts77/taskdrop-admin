import Link from 'next/link';
import type { ReactNode } from 'react';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import type { FormAction } from '@/components/ConfirmAction';
import { PhotoStrip } from '@/components/PhotoStrip';
import { HideTaskCard, TaskCategoryCard } from '@/components/views/ModerationViews';
import type { DisputeReason, MoneySettings, TaskDetail } from '@/lib/data';
import type { TaskHold } from '@/lib/data/tasks';
import { inr, istDateTime, pct } from '@/lib/format';
import { ledgerKind, taskStatus, type Tone as OldTone } from '@/lib/labels';
import type { TaskPhotos } from '@/lib/photos';
import { buildTimeline } from '@/lib/task-timeline';
import { isTestRow } from '@/lib/test-data';
import { DecideDispute } from './DecideDispute';

const PILL: Record<OldTone, v2.Tone> = { green: 'ok', gold: 'wait', blue: 'earn', red: 'bad', grey: 'mut' };
const HOLDING = new Set(['assigned', 'started']);

/** Plan B hold status in words that say whose money it is (task_holds.status, migration 195/255). */
function holdWords(h: TaskHold, poster: string, worker: string | null): { tone: v2.NoteTone; text: string } {
  const w = worker ?? 'the worker';
  switch (h.status) {
    case 'awaiting_payment':
      return { tone: 'plain', text: `${w} is hired, but ${poster} hasn’t paid yet. Nothing is held.` };
    case 'held':
      return { tone: 'gold', text: `Held by the payment company since ${h.paidAt ? istDateTime(h.paidAt) : 'payment'}. It still belongs to ${poster} until the work is approved or a dispute is decided.` };
    case 'release_asked':
      return { tone: 'blue', text: `Being sent to ${w}’s bank or UPI (${inr(h.releaseMinor ?? h.workerShareMinor)}).` };
    case 'released':
      return { tone: 'jade', text: `Released${h.settledAt ? ` on ${istDateTime(h.settledAt)}` : ''}: ${inr(h.releaseMinor ?? h.workerShareMinor)} went to ${w}’s bank or UPI.` };
    case 'refund_asked':
      return { tone: 'blue', text: `Going back to ${poster}’s card or UPI (${inr(h.refundMinor ?? h.chargedMinor)}).` };
    case 'refunded':
      return { tone: 'jade', text: `Refunded${h.settledAt ? ` on ${istDateTime(h.settledAt)}` : ''}: ${inr(h.refundMinor ?? h.chargedMinor)} went back to ${poster}.` };
    case 'split_asked':
      return { tone: 'blue', text: `Being split: ${inr(h.refundMinor ?? 0)} back to ${poster}, then ${inr(h.releaseMinor ?? 0)} to ${w}.` };
    case 'split':
      return { tone: 'jade', text: `Split${h.settledAt ? ` on ${istDateTime(h.settledAt)}` : ''}: ${inr(h.refundMinor ?? 0)} back to ${poster}, ${inr(h.releaseMinor ?? 0)} to ${w}.` };
    case 'failed':
      return { tone: 'orange', text: `The payment company refused a move${h.note ? `: ${h.note}` : ''}. Retry it from Money → Pay per task moves.` };
    case 'expired':
      return { tone: 'plain', text: `${poster} didn’t pay in time, so the hire ended. No money moved.` };
    default:
      return { tone: 'plain', text: '—' };
  }
}

export function TaskPageV2({
  t,
  settings,
  now,
  hold,
  dispute,
  moderation,
  photos,
  hideMoney,
  canMoney,
  decide,
  cancelTask,
}: {
  t: TaskDetail;
  settings: MoneySettings;
  now: string;
  /** Plan B hold, null for an older wallet job or when the service key is missing. */
  hold: TaskHold | null;
  dispute: DisputeReason | null;
  moderation: { hidden: boolean; reason: string | null; setup: boolean } | null;
  photos: TaskPhotos | null;
  hideMoney: boolean;
  canMoney: boolean;
  decide: FormAction;
  cancelTask?: FormAction;
}) {
  const st = taskStatus(t.status);
  const a = t.assignment;
  const price = t.lockedMinor ?? t.budgetMinor;
  const disputed = t.status === 'DISPUTED';
  const finished = t.status === 'COMPLETED' || t.status === 'AUTO_COMPLETED';
  const cancelled = t.status === 'CANCELLED';
  const test = isTestRow({ posterId: t.posterId, title: t.title });

  // Money numbers: a Plan B hold says exactly; an older wallet job is worked out as today.
  const escrow = a?.escrowMinor ?? null;
  const walletFee = escrow !== null && t.lockedMinor !== null ? Math.max(0, escrow - t.lockedMinor) : null;
  const walletNet = t.lockedMinor !== null ? Math.round(t.lockedMinor * (1 - settings.commissionPct)) : null;
  const fee = hold ? hold.feeMinor : walletFee;
  const paidTotal = hold ? (hold.paidAt || hold.status !== 'awaiting_payment' ? hold.chargedMinor : null) : t.fundedAt ? escrow : null;
  const workerGets = hold ? hold.workerShareMinor : walletNet;
  const taskdropWill = hold ? hold.commissionMinor + hold.feeMinor : t.lockedMinor !== null && walletNet !== null ? t.lockedMinor - walletNet + (walletFee ?? 0) : null;
  const paid = hold ? hold.status !== 'awaiting_payment' && hold.status !== 'expired' : Boolean(t.fundedAt);
  const holdHeld = hold?.status === 'held';

  let where: { tone: v2.NoteTone; text: ReactNode };
  if (hold) where = holdWords(hold, t.poster, a?.worker ?? null);
  else if (!a) where = { tone: 'plain', text: 'Nobody is hired yet, so no money is involved.' };
  else if (!t.fundedAt) where = { tone: 'plain', text: `${a.worker} is hired, but ${t.poster} hasn’t paid yet. Nothing is held.` };
  else if (disputed) where = { tone: 'orange', text: 'Frozen until an admin decides the dispute.' };
  else if (HOLDING.has(a.status)) where = { tone: 'gold', text: `Held by TaskDrop since ${istDateTime(t.fundedAt)}. It still belongs to ${t.poster} until they approve the work.` };
  else if (finished) where = { tone: 'jade', text: `Released${t.completedAt ? ` on ${istDateTime(t.completedAt)}` : ''} to ${a.worker}’s TaskDrop wallet${t.clearAt && !t.clearedAt ? `, withdrawable from ${istDateTime(t.clearAt)}` : ''}.` };
  else if (cancelled)
    where = {
      tone: 'plain',
      text:
        t.payment && t.payment.refundedMinor > 0 ? (
          `Cancelled. ${inr(t.payment.refundedMinor)} was refunded to ${t.poster} through Razorpay.`
        ) : t.payment ? (
          <>Cancelled. What {t.poster} paid by card is owed back. Send it from <Link href="/refunds">Refunds</Link>.</>
        ) : (
          `Cancelled. Everything ${t.poster} paid went back to their TaskDrop wallet.`
        ),
    };
  else where = { tone: 'plain', text: '—' };

  const timeline = buildTimeline(t, a ? { worker: a.worker, createdAt: a.createdAt } : null, istDateTime);

  // ---- decide card -------------------------------------------------------------------------
  let decideCard: ReactNode = null;
  if (disputed && a && !hideMoney) {
    if (!paid) {
      decideCard = (
        <v2.Note tone="orange" title="This dispute has no money to decide over">
          {t.poster} never paid for this job, so there is nothing to pay out or refund. It can only be cancelled.
        </v2.Note>
      );
    } else if (hold && !holdHeld) {
      decideCard = (
        <v2.Note tone="gold" title="The money is already moving">
          {holdWords(hold, t.poster, a.worker).text}
        </v2.Note>
      );
    } else {
      decideCard = (
        <v2.Card
          title="Decide this dispute"
          sub="Read the job, the quotes and the reviews first. Money is held safely until you decide."
          right={<v2.Pill tone="bad">Money frozen</v2.Pill>}
        >
          <v2.Grid cols={2}>
            <div className="wp2-says jade">
              <div className="small b">{t.poster} (poster)</div>
              {dispute && dispute.byId === t.posterId ? `“${dispute.reason}”` : <span className="muted">Nothing written.</span>}
            </div>
            <div className="wp2-says blue">
              <div className="small b">{a.worker} (worker)</div>
              {dispute && dispute.byId === a.workerId ? `“${dispute.reason}”` : <span className="muted">Nothing written.</span>}
            </div>
          </v2.Grid>
          {canMoney ? (
            <DecideDispute
              action={decide}
              taskId={t.id}
              title={t.title}
              poster={t.poster}
              worker={a.worker}
              workerGets={workerGets}
              posterGets={paidTotal}
              workerWhen={hold ? 'sent to their bank or UPI' : `withdrawable after ${settings.clearingDays} days`}
              posterWhere={hold ? 'back to the card or UPI they paid with' : 'back to their TaskDrop wallet'}
              hold={holdHeld && hold ? { offerMinor: hold.offerMinor, chargedMinor: hold.chargedMinor, workerShareMinor: hold.workerShareMinor } : null}
            />
          ) : (
            <p className="small muted">Only Admin and Finance can decide disputes.</p>
          )}
        </v2.Card>
      );
    }
  }

  // ---- earnings lines: Plan B books first, else the older platform ledger ---------------
  const books = hold?.ledger.filter((l) => l.mine === 'taskdrop') ?? [];
  const decision = hold?.releaseKey?.startsWith('dispute:') ? <v2.Pill tone="wait">Split by an admin</v2.Pill> : null;

  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'Jobs', href: '/tasks' }, { label: t.title }]}
        title={
          <>
            {t.title} <v2.TestTag show={test} /> <v2.Pill tone={PILL[st.tone]}>{st.label}</v2.Pill>
          </>
        }
        sub={st.hint}
      />

      {moderation?.hidden ? (
        <v2.Note tone="orange" title="This job is hidden">
          Hidden from everyone.{moderation.reason ? ` Why: ${moderation.reason}.` : ''}
        </v2.Note>
      ) : null}
      {disputed ? (
        <v2.Note tone="red" title="Why it was reported">
          {dispute ? (
            <>
              “{dispute.reason}” <span className="muted">· {dispute.by ?? 'Someone'} · {istDateTime(dispute.at)}</span>
            </>
          ) : (
            'No reason was recorded for this one. It was reported before reasons were kept.'
          )}
        </v2.Note>
      ) : null}

      <v2.Grid cols="main">
        <div className="stack">
          {decideCard}

          {hideMoney ? (
            <v2.Card title="Price">
              <div className="wp2-big">{inr(price)}</div>
              <p className="small muted">Your role sees the price only, no earnings or payments.</p>
            </v2.Card>
          ) : (
            <v2.Card title="The money for this job" right={decision}>
              <v2.KV
                rows={[
                  [t.lockedMinor !== null ? 'Agreed price (quote accepted)' : 'Budget (no quote accepted yet)', inr(price)],
                  [`Service fee paid by the poster (${pct(settings.posterFeePct)})`, paid && fee !== null ? inr(fee) : 'Not yet'],
                  ['Poster paid in total', paid && paidTotal !== null ? inr(paidTotal) : 'Not paid yet'],
                  ...(a && !cancelled && workerGets !== null ? ([[`${a.worker} gets`, inr(hold?.releaseKey?.startsWith('dispute:') && hold.releaseMinor !== null ? hold.releaseMinor : workerGets)]] as [ReactNode, ReactNode][]) : []),
                  ...(taskdropWill !== null && !cancelled ? ([[finished ? 'TaskDrop earned' : 'TaskDrop will earn', inr(taskdropWill)]] as [ReactNode, ReactNode][]) : []),
                  ...(hold ? ([['Paid with', hold.provider === 'simulated' ? 'Pay per task (simulated on staging)' : 'Pay per task (Razorpay)']] as [ReactNode, ReactNode][]) : []),
                  ...(hold?.paymentId ? ([['Razorpay payment', <span key="p" className="wp2-mono">{hold.paymentId}</span>]] as [ReactNode, ReactNode][]) : []),
                  ...(!hold && t.payment
                    ? ([['Razorpay payment', `${t.payment.providerPaymentId ?? '—'} · ${t.payment.status} · refunded ${inr(t.payment.refundedMinor)}`]] as [ReactNode, ReactNode][])
                    : []),
                ]}
              />
              <v2.Note tone={where.tone} title="Where the money is now">
                {where.text}
              </v2.Note>
            </v2.Card>
          )}

          <v2.Card title="What the poster asked for">
            <p className="wp2-prose">{t.description || <span className="muted">No description.</span>}</p>
            <p className="small muted">{[t.category, t.place, t.kind].filter(Boolean).join(' · ')}</p>
          </v2.Card>

          <v2.Card title={`Photos and files${photos ? ` (${photos.photos.length})` : ''}`} sub="Each opens full size in a new tab; the links stop working within two hours.">
            {photos === null ? (
              <p className="small muted">Photos can’t be shown right now.</p>
            ) : photos.photos.length ? (
              <PhotoStrip photos={photos.photos} />
            ) : (
              <p className="small muted">No photos or files on this job.</p>
            )}
            {photos && !photos.imageKitReady ? <v2.SetupNotice what="Some pictures are stored in ImageKit, which this panel can’t read yet." detail="IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT" /> : null}
          </v2.Card>

          <v2.Card title={`Quotes (${t.quotes.length})`}>
            <v2.DataTable
              columns={[{ label: 'Worker' }, { label: 'Price', right: true }, { label: 'Message' }, { label: 'Sent' }]}
              empty="No quotes yet"
              rows={t.quotes.map((q) => ({
                key: q.id,
                href: `/users/${q.workerId}`,
                cells: [
                  <>
                    {q.worker} {q.chosen ? <v2.Pill tone="ok">Chosen</v2.Pill> : null}
                  </>,
                  inr(q.priceMinor),
                  <span key="m" className="small">{q.message ? `“${q.message}”` : '—'}</span>,
                  istDateTime(q.createdAt),
                ],
              }))}
            />
          </v2.Card>

          <v2.Card title="Timeline">
            <ol className="wp2-tl">
              {timeline.map((s, i) => (
                <li key={i} className={s.at ? 'done' : 'todo'}>
                  <b>{s.label}</b>
                  <small>{s.at ? istDateTime(s.at) : (s.note ?? 'Not yet')}</small>
                </li>
              ))}
            </ol>
          </v2.Card>

          {hideMoney ? null : (
            <v2.Card title="TaskDrop’s earnings from this job">
              {books.length ? (
                <v2.DataTable
                  columns={[{ label: 'Type' }, { label: 'When' }, { label: 'Amount', right: true }]}
                  rows={books.map((l) => ({
                    key: l.id,
                    cells: [<v2.Pill key="k" tone={l.kind === 'commission' ? 'ok' : 'earn'}>{l.kind === 'commission' ? 'Commission' : 'Service fee'}</v2.Pill>, istDateTime(l.at), inr(l.amountMinor)],
                  }))}
                />
              ) : t.ledger.length ? (
                <v2.DataTable
                  columns={[{ label: 'Type' }, { label: 'When' }, { label: 'Amount', right: true }]}
                  rows={t.ledger.map((l) => ({
                    key: l.id,
                    href: `/money/entries?when=all&kind=${l.kind}`,
                    cells: [ledgerKind(l.kind).label, istDateTime(l.at), inr(l.amount)],
                  }))}
                />
              ) : (
                <p className="small muted">Nothing booked yet. TaskDrop earns when the work is approved.</p>
              )}
            </v2.Card>
          )}

          <v2.Card title="Reviews">
            {t.reviews.length ? (
              <ul className="wp2-reviews">
                {t.reviews.map((r, i) => (
                  <li key={i}>
                    <b>{'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))}</b> <span className="small muted">{r.author} about the {r.aboutRole}</span>
                    {r.comment ? <p>“{r.comment}”</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">No reviews yet.</p>
            )}
          </v2.Card>

          <div className="wp2-foot small muted">
            <Link href={`/tasks?q=${encodeURIComponent(t.title.slice(0, 30))}`}>Find similar jobs →</Link>
            <span>
              Job id <span className="wp2-mono">{t.id}</span> · checked {istDateTime(now)}
            </span>
          </div>
        </div>

        <div className="stack">
          <v2.Card title="People">
            <v2.KV
              rows={[
                ['Poster', <Link key="p" href={`/users/${t.posterId}`}>{t.poster}</Link>],
                ['Worker', a ? <Link key="w" href={`/users/${a.workerId}`}>{a.worker}</Link> : <span className="muted">No worker hired yet</span>],
              ]}
            />
          </v2.Card>
          {moderation ? <HideTaskCard taskId={t.id} state={moderation} /> : null}
          {moderation ? <TaskCategoryCard taskId={t.id} category={t.category} /> : null}
          {cancelTask && (t.status === 'OPEN' || t.status === 'LOCKED') ? (
            <v2.Card title="Cancel this job" sub="For a job where work has not started.">
              <Confirm
                action={cancelTask}
                hidden={{ taskId: t.id }}
                label="Cancel and refund"
                tier={2}
                area="money"
                tone="danger"
                title="Cancel this job and refund the poster?"
                body={<p>The job closes and nobody can offer on it. Anything the poster paid goes back to them with no fine. The poster{a ? ' and the hired worker are' : ' is'} told. This can’t be undone.</p>}
                reason={{ label: 'Why (the poster sees this)', placeholder: 'e.g. posted twice by mistake' }}
                confirmLabel="Cancel the job"
              />
            </v2.Card>
          ) : null}
        </div>
      </v2.Grid>
    </>
  );
}
