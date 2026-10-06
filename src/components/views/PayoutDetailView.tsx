import Link from 'next/link';
import type { MfaState } from '@/lib/mfa';
import type { PayoutDetail, PayoutMethod, RazorpayXState } from '@/lib/data';
import { inr, istDateTime, timeAgo } from '@/lib/format';
import { payoutStage, payoutStatus, PAYOUT_STAGE } from '@/lib/labels';
import { MoneyLock } from '../MoneyLock';
import { ClickCard } from '../Clickable';
import { ConfirmAction, type FormAction } from '../ConfirmAction';
import { CopyButton } from '../CopyButton';
import { Icon } from '../Icon';
import { UpiQr } from '../UpiQr';
import { Card, KV, Money, Notice, PageHeader, PersonLink, Pill } from '../ui';
import { destinationOf, RoleTag, sentence, stageHelp, upiLink } from './PayoutsView';

export function PayoutDetailView({
  d,
  now: nowIso,
  rx,
  method,
  mfa,
  markPayout,
  checkAll,
  giveBack,
}: {
  d: PayoutDetail;
  now: string;
  rx: RazorpayXState;
  method: PayoutMethod;
  mfa: MfaState;
  markPayout: FormAction;
  checkAll: FormAction;
  giveBack: FormAction;
}) {
  const now = new Date(nowIso);
  const { p, queued: q } = d;
  const first = d.name.split(' ')[0] || d.name;
  const amount = inr(p.amount_minor);
  const ref = p.id.slice(0, 8);
  const open = p.status === 'requested' || p.status === 'processing';
  const rxOn = method === 'razorpayx' && rx.configured;
  const stage = q ? payoutStage(q, now.getTime(), rxOn) : null;
  // A person pays it: it was taken over by hand, or RazorpayX is off and it never reached RazorpayX.
  const byHand = stage === 'manual' || (stage === 'not-sent' && !rxOn);
  const dest = q ? destinationOf(q) : null;
  const st = payoutStatus(p.status, first);
  const label = p.status === 'paid' ? (p.via === 'razorpayx' ? 'Paid by RazorpayX' : 'Paid by hand') : stage && !byHand ? PAYOUT_STAGE[stage].label : st.label;
  const hidden = { id: p.id, name: d.name, amount };

  const recordPaid = (channel: 'upi' | 'bank' | 'other', primary: boolean) => {
    const words = { upi: 'by UPI', bank: 'by bank transfer', other: 'another way' }[channel];
    return (
      <ConfirmAction
        key={channel}
        action={markPayout}
        hidden={{ ...hidden, status: 'paid', channel }}
        trigger={channel === 'other' ? 'Paid another way' : `Paid ${words}`}
        tone={primary ? 'primary' : 'quiet'}
        title={`Record ${amount} as sent to ${d.name} ${words}?`}
        consequence={
          <>
            This only records the payment. It does <strong>not</strong> send money. Confirm only after {amount} has left your account. {first} gets a
            notification that the money was sent. It can’t be undone.
          </>
        }
        field={{
          name: 'note',
          label: channel === 'other' ? 'How you paid, and its reference' : `${channel === 'upi' ? 'UPI' : 'Bank'} reference (UTR)`,
          placeholder: channel === 'other' ? 'e.g. cash, receipt 14' : 'e.g. 624100983317',
          required: true,
          help: channel === 'other' ? undefined : `Shown in your ${channel === 'upi' ? 'UPI app' : 'bank statement'} after the transfer.`,
        }}
        confirmLabel={`Yes, I sent ${amount}`}
      />
    );
  };

  return (
    <>
      <PageHeader
        crumbs={[{ href: '/payouts', label: 'Payouts' }, { label: `${amount} to ${d.name}` }]}
        title={
          <>
            <Money minor={p.amount_minor} /> withdrawal
          </>
        }
        sub={
          <span className="head-meta">
            <Pill tone={byHand && open ? 'gold' : st.tone}>{byHand && p.status === 'requested' ? 'Waiting for you to pay' : label}</Pill> Asked by{' '}
            <PersonLink id={p.user_id} name={d.name} />
            <RoleTag roles={d.roles} /> · {timeAgo(p.created_at, now)} · ref {ref}
          </span>
        }
      />

      <MoneyLock mfa={mfa} />

      {open && !q ? (
        <Notice tone="gold" title="Couldn’t load the payment details.">
          This withdrawal is still open but the payout queue didn’t return it. Refresh the page; if it stays like this, check migration 069 is applied.
        </Notice>
      ) : null}

      {open && q && byHand ? (
        <Card title={`Pay ${first}`} sub="Two steps: send the money from your own UPI app or bank, then record the bank reference here.">
          <div className="pay-steps">
            <div className="pay-step">
              <div className="pay-step-head">
                <span className="pay-step-num">1</span>
                <strong>Send {amount} to {first}</strong>
              </div>
              {dest?.how === 'UPI' ? (
                <div className="pay-upi">
                  <UpiQr link={upiLink(dest.vpa, d.name, p.amount_minor, ref)} />
                  <div className="pay-upi-text">
                    <strong>Scan with any UPI app on your phone</strong>
                    <span className="muted small">
                      PhonePe, Google Pay, Paytm or your bank’s app. {first}’s UPI id and {amount} are filled in for you.
                    </span>
                    <span className="payto">
                      <span className="payto-kind">UPI</span>
                      <code>{dest.vpa}</code>
                      <CopyButton value={dest.vpa} label="UPI id" />
                    </span>
                    <span className="payto">
                      <span className="payto-kind">Amount</span>
                      <code>{(p.amount_minor / 100).toFixed(2)}</code>
                      <CopyButton value={(p.amount_minor / 100).toFixed(2)} label="amount" />
                    </span>
                    <a className="small" href={upiLink(dest.vpa, d.name, p.amount_minor, ref)}>
                      On a phone? Open it in your UPI app
                    </a>
                  </div>
                </div>
              ) : dest?.how === 'Bank' ? (
                <div className="payout-dest">
                  <span className="dest-label">By bank transfer (IMPS / NEFT) to</span>
                  <span>{dest.name ?? d.name}</span>
                  <span className="dest-kv">
                    Account <code>{dest.account}</code> <CopyButton value={dest.account} label="account number" />
                  </span>
                  {dest.ifsc ? (
                    <span className="dest-kv">
                      IFSC <code>{dest.ifsc}</code> <CopyButton value={dest.ifsc} label="IFSC" />
                    </span>
                  ) : null}
                  <span className="dest-kv">
                    Amount <code>{(p.amount_minor / 100).toFixed(2)}</code> <CopyButton value={(p.amount_minor / 100).toFixed(2)} label="amount" />
                  </span>
                </div>
              ) : (
                <span className="dest-missing">
                  <Icon name="alert" size={16} /> Can’t send yet. {dest?.how === 'MISSING' ? dest.why : ''}
                </span>
              )}
              {p.status === 'requested' && dest?.how !== 'MISSING' ? (
                <div className="pay-step-actions">
                  <ConfirmAction
                    action={markPayout}
                    hidden={{ ...hidden, status: 'processing' }}
                    trigger={`I’m paying it now: stop ${first} cancelling`}
                    tone="quiet"
                    title={`Lock this withdrawal while you pay ${first}?`}
                    consequence={
                      <>
                        Recommended before you send. {first} can no longer cancel it, so the money can’t land back in their earnings while it’s also on its way to their
                        bank. Nothing is sent by this button.
                      </>
                    }
                    confirmLabel="Lock it"
                  />
                </div>
              ) : p.status === 'processing' ? (
                <p className="muted small">Locked: {first} can no longer cancel it.</p>
              ) : null}
            </div>

            {dest && dest.how !== 'MISSING' ? (
              <div className="pay-step">
                <div className="pay-step-head">
                  <span className="pay-step-num">2</span>
                  <strong>Record that you paid</strong>
                </div>
                <p className="muted small">Pick how you sent it and type the reference your UPI app or bank gave you.</p>
                <div className="pay-step-actions">
                  {dest.how === 'UPI' ? [recordPaid('upi', true), recordPaid('bank', false)] : [recordPaid('bank', true), recordPaid('upi', false)]}
                  {recordPaid('other', false)}
                </div>
              </div>
            ) : null}

            <div className="pay-step">
              <div className="pay-step-head">
                <span className="pay-step-num">!</span>
                <strong>Can’t pay it?</strong>
              </div>
              <div className="pay-step-actions">
                <ConfirmAction
                  action={markPayout}
                  hidden={{ ...hidden, status: 'failed' }}
                  trigger={p.status === 'processing' ? 'It didn’t go through' : `Don’t send: put ${amount} back in ${first}’s earnings`}
                  tone="danger"
                  title={`Put ${amount} back in ${d.name}’s earnings?`}
                  consequence={
                    <>
                      {amount} goes back into <strong>{d.name}’s own TaskDrop earnings</strong>, and they are told why. They can withdraw it again. Only do this if the
                      money did not leave your account.
                    </>
                  }
                  field={{ name: 'note', label: 'Why? ' + first + ' sees this', placeholder: 'e.g. bank rejected the UPI id', required: true }}
                  confirmLabel={`Put ${amount} back`}
                />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {open && q && stage && !byHand ? (
        <Card title="With RazorpayX" sub={PAYOUT_STAGE[stage].label}>
          <p>{stageHelp(stage, q, first, rxOn)}</p>
          <div className="pay-step-actions">
            {rx.configured ? (
              <ConfirmAction
                action={checkAll}
                hidden={{}}
                trigger="Check with RazorpayX"
                tone="quiet"
                title="Ask RazorpayX where this stands?"
                consequence={<>Waiting withdrawals are sent and quiet ones re-checked. The same key is used every time, so nothing can be paid twice.</>}
                confirmLabel="Check now"
              />
            ) : null}
            {stage === 'not-sent' ? (
              <ConfirmAction
                action={markPayout}
                hidden={{ ...hidden, status: 'processing' }}
                trigger="Pay it by hand instead"
                tone="quiet"
                title={`Pay ${amount} to ${d.name} yourself?`}
                consequence={<>RazorpayX will never send this one. This page then shows where to send it and lets you record the reference.</>}
                confirmLabel="Yes, I’ll pay it by hand"
              />
            ) : null}
            {stage === 'stuck' ? (
              <ConfirmAction
                action={giveBack}
                hidden={hidden}
                trigger={`Give ${amount} back to ${first}`}
                tone="danger"
                title={`Stop this withdrawal and give ${amount} back to ${d.name}?`}
                consequence={<>RazorpayX is asked first. Only if it confirms it never made this payout does the money go back to {first}’s earnings.</>}
                confirmLabel="Ask RazorpayX, then give it back"
              />
            ) : null}
          </div>
        </Card>
      ) : null}

      {p.status === 'paid' ? (
        <Notice tone="green" title={`Sent to ${first}${p.reference ? ` · ${p.reference}` : ''}`}>
          Settled {istDateTime(p.updated_at)}. Nothing more to do. {first} was told the money is on its way.
        </Notice>
      ) : p.status === 'failed' ? (
        <Notice tone="red" title={p.reversed_at ? 'The bank sent it back' : 'It didn’t go through'}>
          {sentence(p.failure_note ?? 'No reason was recorded')} The {amount} is back in {first}’s TaskDrop earnings, and {first} was told. There is nothing to pay
          now: if {first} asks again, the new request appears on Payouts. If it keeps failing, <Link href={`/users/${p.user_id}#message`}>message {first}</Link> to check
          their account details.
        </Notice>
      ) : p.status === 'cancelled' ? (
        <Notice tone="blue" icon="undo" title={`${first} cancelled this withdrawal`}>
          The {amount} went back into {first}’s earnings. Nothing to do.
        </Notice>
      ) : null}

      <div className="grid-main-side">
        <Card title="Details">
          <KV
            rows={[
              { label: 'Amount', value: <Money minor={p.amount_minor} />, strong: true },
              { label: 'Status', value: <Pill tone={st.tone}>{label}</Pill> },
              { label: 'Asked for', value: istDateTime(p.created_at) },
              { label: 'Last change', value: istDateTime(p.updated_at) },
              { label: 'Sent to', value: p.destination ?? <span className="muted">No account recorded</span> },
              { label: 'Paid', value: p.via === 'razorpayx' ? 'By RazorpayX' : 'By hand' },
              ...(p.reference ? [{ label: 'Bank reference', value: p.reference }] : []),
              ...(p.failure_note ? [{ label: 'Reason', value: p.failure_note }] : []),
              ...(p.provider_payout_id ? [{ label: 'RazorpayX payout', value: <code>{p.provider_payout_id}</code> }] : []),
              ...(p.provider_status ? [{ label: 'RazorpayX says', value: p.provider_status }] : []),
              ...(p.attempts ? [{ label: 'Times sent to RazorpayX', value: String(p.attempts) }] : []),
              ...(p.fee_minor != null ? [{ label: 'RazorpayX fee', value: <Money minor={p.fee_minor + (p.tax_minor ?? 0)} /> }] : []),
              {
                label: 'Withdrawal id',
                value: (
                  <>
                    <code>{p.id}</code> <CopyButton value={p.id} label="withdrawal id" />
                  </>
                ),
              },
            ]}
          />
        </Card>

        <div className="stack">
          <Card title="Who asked">
            <KV
              rows={[
                { label: 'Name', value: <PersonLink id={p.user_id} name={d.name} /> },
                { label: 'Uses TaskDrop as', value: d.roles.length ? d.roles.map((r) => (r === 'worker' ? 'Worker' : 'Poster')).join(' and ') : '—' },
                ...(d.walletMinor !== null ? [{ label: 'Earnings left to withdraw', value: <Money minor={d.walletMinor} /> }] : []),
              ]}
            />
            <Link className="btn btn-small" href={`/users/${p.user_id}`}>
              Open {first}’s page: jobs, wallet, message them
            </Link>
          </Card>

          <Card title={`${first}’s other withdrawals`}>
            {d.others.length ? (
              <ul className="plain-list">
                {d.others.map((o) => {
                  const os = payoutStatus(o.status, first);
                  return (
                    <ClickCard key={o.id} as="li" href={`/payouts/${o.id}`}>
                      <span>
                        <Link href={`/payouts/${o.id}`}>
                          <Money minor={o.amount_minor} />
                        </Link>
                        <span className="muted small block">{istDateTime(o.updated_at)}</span>
                      </span>
                      <Pill tone={os.tone}>{os.label}</Pill>
                    </ClickCard>
                  );
                })}
              </ul>
            ) : (
              <p className="muted small">This is {first}’s only withdrawal.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
