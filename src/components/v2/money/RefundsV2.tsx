import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import type { FormAction } from '@/components/ConfirmAction';
import { CopyButton } from '@/components/CopyButton';
import type { RefundOwed } from '@/lib/data/money';
import { inr, istDateTime } from '@/lib/format';

/** Refunds (design v2). Same data and the same sendRefund action as today; the box asks to type the amount (tier 3). */
export function RefundsV2({ rows, all, sendRefund }: { rows: RefundOwed[] | null; all: number; sendRefund: FormAction }) {
  const owed = (rows ?? []).reduce((a, r) => a + r.dueMinor, 0);
  const hidden = rows ? all - rows.length : 0;
  return (
    <>
      <v2.PageHeader
        title="Refunds"
        sub="Posters’ money from cancelled jobs that still has to go back to them."
        crumbs={[{ label: 'Money', href: '/money' }, { label: 'Refunds' }]}
      />
      {rows === null ? (
        <v2.SetupNotice what="Refunds owed need the server key" detail="SUPABASE_SERVICE_ROLE_KEY" />
      ) : (
        <>
          <details className="v2-how">
            <summary>How it works</summary>
            <ol>
              <li>When a paid job is cancelled, the poster is owed what they paid, minus what was kept for the worker (the cancel fee).</li>
              <li>
                <b>Send refund</b> asks Razorpay to return it to the card or UPI the poster paid with. The amount is worked out by the database, not typed in.
              </li>
              <li>It is marked refunded only after Razorpay accepts it. Money usually reaches the poster in 5–7 working days.</li>
            </ol>
          </details>
          {hidden ? <p className="v2-muted small">{hidden} refund{hidden === 1 ? '' : 's'} for test jobs hidden.</p> : null}
          <v2.Card title={`${rows.length} refund${rows.length === 1 ? '' : 's'} owed`} sub={rows.length ? `${inr(owed)} in total. Oldest first.` : undefined}>
            <v2.DataTable
              columns={[
                { label: 'Job' },
                { label: 'Poster' },
                { label: 'Paid', right: true },
                { label: 'Kept for worker', right: true },
                { label: 'Owed back', right: true },
                { label: 'Cancelled' },
                { label: 'Razorpay payment' },
                { label: '' },
              ]}
              empty="Nothing owed. Every cancelled job has been refunded."
              rows={rows.map((r) => ({
                key: r.taskId,
                cells: [
                  <Link key="j" href={`/tasks/${r.taskId}`}>{r.title}</Link>,
                  r.posterId ? <Link key="p" href={`/users/${r.posterId}`}>{r.poster}</Link> : r.poster,
                  inr(r.paidMinor),
                  inr(r.penaltyMinor),
                  <b key="o">{inr(r.dueMinor)}</b>,
                  r.cancelledAt ? istDateTime(r.cancelledAt) : '—',
                  r.providerPaymentId ? (
                    <span key="r" className="small">
                      <code className="v2-mono">{r.providerPaymentId}</code> <CopyButton value={r.providerPaymentId} label="payment id" compact />
                    </span>
                  ) : (
                    '—'
                  ),
                  <Confirm
                    key="c"
                    action={sendRefund}
                    hidden={{ taskId: r.taskId, poster: r.poster }}
                    label="Send refund"
                    tier={3}
                    area="money"
                    small
                    title={`Refund ${inr(r.dueMinor)} to ${r.poster}?`}
                    body={
                      <>
                        <p>Razorpay sends {inr(r.dueMinor)} back to the card or UPI {r.poster} paid with. This can’t be undone.</p>
                        {r.penaltyMinor > 0 ? <p>The worker keeps the {inr(r.penaltyMinor)} already kept for their time.</p> : null}
                      </>
                    }
                    word={(r.dueMinor / 100).toFixed(2).replace(/\.00$/, '')}
                    confirmLabel={`Refund ${inr(r.dueMinor)}`}
                  />,
                ],
              }))}
            />
          </v2.Card>
          <p className="v2-muted small">
            <v2.NewTag /> Pay per task refunds that failed at Razorpay are retried on <Link href="/money#moves">Earnings &amp; escrow</Link>.
          </p>
        </>
      )}
    </>
  );
}
