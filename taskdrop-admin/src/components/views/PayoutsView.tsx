import type { MoneyPosition, PayoutTotals, QueuedPayout, RazorpayXState, SettledPayout } from '@/lib/data';
import { inr, istDateTime, timeAgo } from '@/lib/format';
import { initials, payoutStage, payoutStatus, PAYOUT_STAGE, type PayoutStage } from '@/lib/labels';
import { ConfirmAction, type FormAction } from '../ConfirmAction';
import { CopyButton } from '../CopyButton';
import { Icon } from '../Icon';
import { Card, Empty, HowItWorks, Money, Notice, PageHeader, PersonLink, Pill } from '../ui';

export type PayoutsData = {
  now: string;
  queue: QueuedPayout[];
  totals: PayoutTotals;
  history: SettledPayout[];
  /** Null until migration 066 is applied. */
  position: MoneyPosition | null;
  rx: RazorpayXState;
};

type Dest =
  | { how: 'UPI'; vpa: string }
  | { how: 'Bank'; name: string | null; account: string; ifsc: string | null }
  | { how: 'MISSING'; why: string };

/** Where the money has to go, for a withdrawal a person pays by hand. */
function destinationOf(p: QueuedPayout): Dest {
  if (p.kind === 'upi' && p.upi_id) return { how: 'UPI', vpa: p.upi_id };
  if (p.kind === 'bank' && p.account_number) return { how: 'Bank', name: p.account_name, account: p.account_number, ifsc: p.ifsc };
  if (p.snapshot && /@/.test(p.snapshot)) return { how: 'UPI', vpa: p.snapshot };
  return {
    how: 'MISSING',
    why: p.snapshot
      ? `Only a masked copy (${p.snapshot}) is on file, which you can’t pay into. Ask them to add their account again.`
      : 'No payout account on file. Ask them to add a UPI id or bank account.',
  };
}

/** A upi:// link opens a UPI app with the payee, amount and note filled in. */
function upiLink(vpa: string, name: string, minor: number, ref: string): string {
  const q = new URLSearchParams({ pa: vpa, pn: name || 'TaskDrop worker', am: (minor / 100).toFixed(2), cu: 'INR', tn: `TaskDrop payout ${ref}` });
  return `upi://pay?${q.toString()}`;
}

type Stage = PayoutStage;
const STAGE = PAYOUT_STAGE;
const MIN = 60 * 1000;
const stageOf = (p: QueuedPayout, now: number, rxOn: boolean): Stage => payoutStage(p, now, rxOn);

/** A note as a sentence: RazorpayX's reasons arrive without a full stop. */
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

function stageHelp(s: Stage, p: QueuedPayout, first: string): string {
  switch (s) {
    case 'not-sent':
      return `${first} asked, but it hasn’t reached RazorpayX yet. “Check with RazorpayX” sends it. ${first} can still cancel it until then.`;
    case 'sending':
      return p.status === 'requested'
        ? `Asked a moment ago; ${first}’s app is handing it to RazorpayX.`
        : 'Handed to RazorpayX a moment ago. It can’t be cancelled now.';
    case 'stuck':
      return `RazorpayX hasn’t answered for over 30 minutes${p.failure_note ? ` (last error: ${p.failure_note.replace(/[.]$/, '')})` : ''}. “Check with RazorpayX” tries again with the same key, so it can never go twice.`;
    case 'queued':
      return 'RazorpayX accepted it but the account balance is too low. It goes out by itself as soon as you add money to the RazorpayX account.';
    case 'approval':
      return 'Your RazorpayX account asks for approval on each payout. Approve it in the RazorpayX dashboard, or turn approvals off for API payouts.';
    case 'check':
      return `${p.failure_note ?? ''} Nothing was settled automatically.`;
    case 'with-bank':
      return `RazorpayX has sent it${p.provider_status ? ` (${p.provider_status})` : ''}; waiting for the bank to confirm.`;
    default:
      return '';
  }
}

export function PayoutsView({
  d,
  markPayout,
  checkAll,
  giveBack,
}: {
  d: PayoutsData;
  markPayout: FormAction;
  checkAll: FormAction;
  giveBack: FormAction;
}) {
  const now = new Date(d.now);
  const nowMs = now.getTime();
  const rxOn = d.rx.configured;
  const staged = d.queue.map((p) => ({ p, stage: stageOf(p, nowMs, rxOn) }));
  const needsYou = staged.filter((x) => STAGE[x.stage].needsYou);
  const onTheWay = staged.filter((x) => !STAGE[x.stage].needsYou);
  const recentFailures = d.history.filter((h) => h.status === 'failed' && nowMs - Date.parse(h.updated_at) < 7 * 24 * 60 * MIN);

  const pos = d.position;
  const bal = d.rx.balanceMinor;
  const ready = pos?.readyToWithdrawMinor ?? d.queue.reduce((a, p) => a + p.amount_minor, 0);
  const shortBy = bal != null ? Math.max(ready - bal, 0) : 0;
  const ownMinor = bal != null && pos ? bal - pos.heldForPeopleMinor : null;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Worker payouts' }]}
        title="Worker payouts"
        sub="RazorpayX sends each withdrawal the moment a worker asks. This page shows whether the account can cover them, and anything that needs you."
      />

      {!rxOn ? (
        <Notice tone="gold" icon="alert" title="RazorpayX isn’t switched on yet.">
          Withdrawals wait until it is. Add RAZORPAYX_ACCOUNT_NUMBER, the API keys and RAZORPAYX_WEBHOOK_SECRET in Supabase, then press “Check with
          RazorpayX” to send the waiting ones. Until then you can pay a withdrawal by hand and record it below.
        </Notice>
      ) : d.rx.error ? (
        <Notice tone="gold" icon="alert" title="Couldn’t read the RazorpayX balance.">
          {d.rx.error}. Withdrawals still go out; only the balance check below is missing.
        </Notice>
      ) : shortBy > 0 ? (
        <Notice tone="red" title={`RazorpayX is ${inr(shortBy)} short.`}>
          Workers can withdraw {inr(ready)} right now and the account holds {inr(bal ?? 0)}. Add at least {inr(shortBy)} to the RazorpayX account.
          Withdrawals it can’t cover wait in RazorpayX’s queue and go out by themselves once the money arrives.
        </Notice>
      ) : null}

      <div className="figures figures-cards">
        <div className="figure card">
          <span className="figure-label">
            <Icon name="bank" size={16} /> In RazorpayX
          </span>
          {bal != null ? <Money minor={bal} className="figure-num" /> : <span className="figure-num">—</span>}
          <span className="muted small">{rxOn ? (bal != null ? 'Read live from RazorpayX' : 'Balance unavailable') : 'Not connected yet'}</span>
        </div>
        <div className="figure card">
          <span className="figure-label">
            <Icon name="send" size={16} /> Ready to withdraw
          </span>
          <Money minor={ready} className="figure-num" />
          <span className="muted small">Workers’ earnings plus withdrawals on the way. The balance must cover this.</span>
        </div>
        <div className="figure card">
          <span className="figure-label">
            <Icon name="people" size={16} /> Held for people
          </span>
          {pos ? <Money minor={pos.heldForPeopleMinor} className="figure-num" /> : <span className="figure-num">—</span>}
          <span className="muted small">
            {pos
              ? `Posters’ wallets ${inr(pos.creditsMinor)} · locked in jobs ${inr(pos.lockedMinor)} · workers ${inr(pos.earningsMinor + pos.clearingMinor + pos.inFlightMinor)}` +
                (pos.refundsOwedMinor + pos.unappliedMinor > 0
                  ? ` · refunds owed ${inr(pos.refundsOwedMinor + pos.unappliedMinor)}`
                  : '')
              : 'Apply migration 066 to see this'}
          </span>
        </div>
        <div className="figure card">
          <span className="figure-label">
            <Icon name="wallet" size={16} /> TaskDrop’s own
          </span>
          {ownMinor != null ? <Money minor={ownMinor} className="figure-num" /> : <span className="figure-num">—</span>}
          <span className="muted small">
            {ownMinor == null
              ? 'In RazorpayX minus held for people'
              : ownMinor >= 0
                ? 'Commission and fees you can move to your bank'
                : 'Negative: RazorpayX holds less than you owe people'}
          </span>
        </div>
      </div>

      <div className="page-actions">
        <ConfirmAction
          action={checkAll}
          hidden={{}}
          trigger="Check with RazorpayX"
          tone="quiet"
          title="Send waiting withdrawals and re-check the rest?"
          consequence={
            <>
              Withdrawals that haven’t reached RazorpayX are sent now; RazorpayX is asked about the ones it has gone quiet on. Each withdrawal uses the same
              key every time, so none can be paid twice, however often you press this.
            </>
          }
          confirmLabel="Check now"
        />
      </div>

      <HowItWorks
        steps={[
          <>A worker asks to withdraw (their name and PAN are on file). The money leaves their earnings at once.</>,
          <>RazorpayX sends it from TaskDrop’s RazorpayX account by IMPS or UPI, usually within minutes, any day of the week.</>,
          <>
            RazorpayX reports back. <strong>Paid</strong> comes with the bank’s reference (UTR). If the bank refuses it, or sends it back later, the money returns to{' '}
            <em>that worker’s</em> earnings, once.
          </>,
        ]}
      />

      <Card title="Needs you" sub="Oldest first." id="queue">
        {needsYou.length || recentFailures.length ? (
          <ul className="payouts">
            {needsYou.map(({ p, stage }) => (
              <PayoutItem key={p.id} p={p} stage={stage} now={now} markPayout={markPayout} giveBack={giveBack} />
            ))}
            {recentFailures.map((h) => (
              <li key={h.id} className="payout">
                <div className="payout-top">
                  <span className="avatar" aria-hidden="true">
                    {initials(h.name)}
                  </span>
                  <div className="payout-who">
                    <strong>
                      <PersonLink id={h.user_id} name={h.name} />
                    </strong>
                    <span className="muted small">
                      {istDateTime(h.updated_at)} · {h.destination ?? 'no account recorded'}
                    </span>
                  </div>
                  <Pill tone="red">{h.reversed_at ? 'Bank sent it back' : 'Came back'}</Pill>
                  <Money minor={h.amount_minor} className="payout-amount" />
                </div>
                <p className="muted small">
                  {sentence(h.failure_note ?? 'It didn’t go through')} The money is back in {h.name.split(' ')[0]}’s earnings. If it keeps failing, ask them to
                  check their account details.
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nothing needs you">Withdrawals are going out by themselves. Anything stuck, short of money or refused shows up here.</Empty>
        )}
      </Card>

      <Card title="On the way" sub="Accepted by RazorpayX; waiting for the bank to confirm." id="on-the-way">
        {onTheWay.length ? (
          <ul className="payouts">
            {onTheWay.map(({ p, stage }) => (
              <PayoutItem key={p.id} p={p} stage={stage} now={now} markPayout={markPayout} giveBack={giveBack} />
            ))}
          </ul>
        ) : (
          <Empty title="Nothing on the way" />
        )}
      </Card>

      <Card
        id="history"
        title="Settled"
        sub={`Last 30 days. Sent today ${inr(d.totals.todayMinor)} (${d.totals.todayCount}) · in total ${inr(d.totals.totalMinor)} (${d.totals.totalCount}).`}
        flush
      >
        {d.history.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">Worker</th>
                  <th className="th">Sent to</th>
                  <th className="th num">Amount</th>
                  <th className="th">What happened</th>
                  <th className="th">Bank reference or reason</th>
                  <th className="th num">RazorpayX fee</th>
                </tr>
              </thead>
              <tbody>
                {d.history.map((h) => {
                  const st = payoutStatus(h.status, h.name.split(' ')[0] ?? h.name);
                  const label =
                    h.status === 'paid'
                      ? h.via === 'manual'
                        ? 'Paid by hand'
                        : 'Paid by RazorpayX'
                      : h.status === 'failed'
                        ? h.reversed_at
                          ? 'Bank sent it back · in their earnings'
                          : 'Came back · in their earnings'
                        : st.label;
                  return (
                    <tr key={h.id}>
                      <td className="td nowrap">{istDateTime(h.updated_at)}</td>
                      <td className="td">
                        <PersonLink id={h.user_id} name={h.name} />
                      </td>
                      <td className="td small">{h.destination ?? '—'}</td>
                      <td className="td num">
                        <Money minor={h.amount_minor} />
                      </td>
                      <td className="td">
                        <Pill tone={st.tone}>{label}</Pill>
                      </td>
                      <td className="td small">{h.reference ?? h.failure_note ?? '—'}</td>
                      <td className="td num small">{h.fee_minor != null ? inr(h.fee_minor + (h.tax_minor ?? 0)) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing settled in the last 30 days" />
        )}
      </Card>
    </>
  );
}

function PayoutItem({
  p,
  stage,
  now,
  markPayout,
  giveBack,
}: {
  p: QueuedPayout;
  stage: Stage;
  now: Date;
  markPayout: FormAction;
  giveBack: FormAction;
}) {
  const name = p.display_name ?? 'this worker';
  const first = (p.display_name ?? 'the worker').split(' ')[0] ?? 'the worker';
  const amount = inr(p.amount_minor);
  const ref = p.id.slice(0, 8);
  const st = STAGE[stage];
  const manual = stage === 'manual';
  const dest = destinationOf(p);

  return (
    <li className="payout">
      <div className="payout-top">
        <span className="avatar" aria-hidden="true">
          {initials(p.display_name)}
        </span>
        <div className="payout-who">
          <strong>
            <PersonLink id={p.user_id} name={name} />
          </strong>
          <span className="muted small">
            Asked {timeAgo(p.requested_at, now)} · ref {ref}
            {p.snapshot ? ` · ${p.snapshot}` : ''}
          </span>
        </div>
        <Pill tone={st.tone}>{manual ? payoutStatus(p.status, first).label : st.label}</Pill>
        <Money minor={p.amount_minor} className="payout-amount" />
      </div>

      {!manual ? <p className="muted small">{stageHelp(stage, p, first)}</p> : null}

      {manual ? (
        <div className="payout-dest">
          {dest.how === 'UPI' ? (
            <>
              <span className="dest-label">Send by UPI to</span>
              <code>{dest.vpa}</code>
              <CopyButton value={dest.vpa} label="UPI id" />
              <a className="btn btn-small btn-ghost" href={upiLink(dest.vpa, p.display_name ?? '', p.amount_minor, ref)}>
                <Icon name="external" size={14} /> Open in UPI app
              </a>
            </>
          ) : dest.how === 'Bank' ? (
            <>
              <span className="dest-label">Send by bank transfer to</span>
              <span>{dest.name ?? name}</span>
              <span className="dest-kv">
                Account <code>{dest.account}</code> <CopyButton value={dest.account} label="account number" />
              </span>
              {dest.ifsc ? (
                <span className="dest-kv">
                  IFSC <code>{dest.ifsc}</code> <CopyButton value={dest.ifsc} label="IFSC" />
                </span>
              ) : null}
            </>
          ) : (
            <span className="dest-missing">
              <Icon name="alert" size={16} /> Can’t send yet. {dest.why}
            </span>
          )}
        </div>
      ) : null}

      <div className="payout-actions">
        {manual && dest.how !== 'MISSING' ? (
          <ConfirmAction
            action={markPayout}
            hidden={{ id: p.id, status: 'paid', name, amount }}
            trigger={`I’ve sent ${amount} to ${first}`}
            title={`Record ${amount} as sent to ${name}?`}
            consequence={
              <>
                This only records the payment. It does <strong>not</strong> send money. Confirm only after {amount} has left your account. It can’t be undone.
              </>
            }
            field={{ name: 'note', label: 'UPI / bank reference (UTR)', placeholder: 'e.g. 624100983317', required: true, help: 'Shown in your UPI app or bank statement.' }}
            confirmLabel={`Yes, I sent ${amount}`}
          />
        ) : null}

        {stage === 'not-sent' ? (
          <ConfirmAction
            action={markPayout}
            hidden={{ id: p.id, status: 'processing', name, amount }}
            trigger="Pay it by hand instead"
            tone="quiet"
            title={`Pay ${amount} to ${name} yourself?`}
            consequence={
              <>
                RazorpayX will never send this one. It moves to “Pay by hand”, where you send it from your own UPI app or bank and record the reference.
                {` ${first}`} can no longer cancel it.
              </>
            }
            confirmLabel="Yes, I’ll pay it by hand"
          />
        ) : null}

        {manual || stage === 'not-sent' ? (
          <ConfirmAction
            action={markPayout}
            hidden={{ id: p.id, status: 'failed', name, amount }}
            trigger={
              dest.how === 'MISSING' && manual
                ? `Can’t pay: put ${amount} back in ${first}’s earnings`
                : p.status === 'processing'
                  ? 'It didn’t go through'
                  : `Don’t send: put it back in ${first}’s earnings`
            }
            tone="danger"
            title={`Put ${amount} back in ${name}’s earnings?`}
            consequence={
              <>
                {amount} goes back into <strong>{name}’s own TaskDrop earnings</strong>. Not the poster’s, and not TaskDrop’s. They can withdraw it again. Only
                do this if the money did not leave your account.
              </>
            }
            field={{
              name: 'note',
              label: p.status === 'processing' ? 'Why didn’t it go through?' : 'Why isn’t it being sent?',
              placeholder: 'e.g. bank rejected the UPI id',
              required: true,
            }}
            confirmLabel={`Put ${amount} back in ${first}’s earnings`}
          />
        ) : null}

        {stage === 'stuck' ? (
          <ConfirmAction
            action={giveBack}
            hidden={{ id: p.id, name, amount }}
            trigger={`Give ${amount} back to ${first}`}
            tone="danger"
            title={`Stop this withdrawal and give ${amount} back to ${name}?`}
            consequence={
              <>
                RazorpayX is asked first. Only if it confirms it never made this payout does {amount} go back into {first}’s earnings. If RazorpayX has it,
                nothing is given back and its real status is recorded instead, so {first} can’t be paid twice.
              </>
            }
            confirmLabel="Ask RazorpayX, then give it back"
          />
        ) : null}
      </div>
    </li>
  );
}
