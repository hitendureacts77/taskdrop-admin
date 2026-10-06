import Link from 'next/link';
import type { MfaState } from '@/lib/mfa';
import type { MoneyPosition, PayoutMethod, PayoutTotals, QueuedPayout, RazorpayXState, SettledPayout, WithdrawalDay } from '@/lib/data';
import { inr, istDateTime, timeAgo } from '@/lib/format';
import { CHART_COLORS, payoutStage, payoutStatus, PAYOUT_STAGE, type PayoutStage, type Tone } from '@/lib/labels';
import { MoneyLock } from '../MoneyLock';
import { ClickRow } from '../Clickable';
import { ConfirmAction, type FormAction } from '../ConfirmAction';
import { CopyButton } from '../CopyButton';
import { Icon } from '../Icon';
import { LineChart } from '../LineChart';
import { Card, Empty, HowItWorks, KV, Money, Notice, PageHeader, Pager, PersonLink, Pill, SearchBox, StatLink, Tabs } from '../ui';

export type PayoutsData = {
  now: string;
  queue: QueuedPayout[];
  totals: PayoutTotals;
  history: SettledPayout[];
  /** Null until migration 066 is applied. */
  position: MoneyPosition | null;
  rx: RazorpayXState;
  /** How new withdrawals are paid: set by the switch on this page. */
  method: PayoutMethod;
  /** Withdrawal requests per Indian day, oldest first, for the chart. */
  daily: WithdrawalDay[];
  days: number;
  /** The chart day that was clicked ("2026-10-04"), with its requests. */
  day: string | null;
  dayLabel: string;
  dayRows: SettledPayout[];
  /** 'worker' and/or 'poster' for each person who has asked to withdraw. */
  roles: Record<string, string[]>;
  /** Name filter from the search box. */
  q: string;
  /** Which settled withdrawals to list, and the page of them. */
  hist: 'all' | 'paid' | 'failed' | 'cancelled';
  histPage: number;
};

/** "Worker", "Poster" or "Worker + poster": who is asking for the money. */
export function RoleTag({ roles }: { roles: string[] | undefined }) {
  const w = roles?.includes('worker');
  const p = roles?.includes('poster');
  const label = w && p ? 'Worker + poster' : w ? 'Worker' : p ? 'Poster' : null;
  return label ? <span className="role-pill">{label}</span> : null;
}

export type Dest =
  | { how: 'UPI'; vpa: string }
  | { how: 'Bank'; name: string | null; account: string; ifsc: string | null }
  | { how: 'MISSING'; why: string };

/** Where the money has to go, for a withdrawal a person pays by hand. */
export function destinationOf(p: QueuedPayout): Dest {
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
export function upiLink(vpa: string, name: string, minor: number, ref: string): string {
  const q = new URLSearchParams({ pa: vpa, pn: name || 'TaskDrop worker', am: (minor / 100).toFixed(2), cu: 'INR', tn: `TaskDrop payout ${ref}` });
  return `upi://pay?${q.toString()}`;
}

type Stage = PayoutStage;
const STAGE = PAYOUT_STAGE;
const MIN = 60 * 1000;
const stageOf = (p: QueuedPayout, now: number, rxOn: boolean): Stage => payoutStage(p, now, rxOn);

/** A note as a sentence: RazorpayX's reasons arrive without a full stop. */
export const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

export function stageHelp(s: Stage, p: QueuedPayout, first: string, rxOn: boolean): string {
  switch (s) {
    case 'not-sent':
      return rxOn
        ? `${first} asked, but it hasn’t reached RazorpayX yet. “Check with RazorpayX” sends it. ${first} can still cancel it until then.`
        : `${first} asked to withdraw. Pay it by hand: press “Pay it by hand”, send the money from your UPI app or bank, then record the reference. ${first} can still cancel it until you start.`;
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

const HIST_PAGE = 25;

/** Where an open withdrawal stands, in two or three words for a table cell. */
function stageLabel(p: QueuedPayout, stage: Stage, rxOn: boolean): { label: string; tone: Tone } {
  if (stage === 'manual' || (stage === 'not-sent' && !rxOn)) {
    return p.status === 'processing' ? { label: 'You’re paying', tone: 'blue' } : { label: 'Waiting', tone: 'gold' };
  }
  return { label: STAGE[stage].label, tone: STAGE[stage].tone };
}

/** The account to pay into, short enough for a table cell, with a copy button. */
function PayTo({ p }: { p: QueuedPayout }) {
  const dest = destinationOf(p);
  if (dest.how === 'UPI') {
    return (
      <span className="payto">
        <span className="payto-kind">UPI</span>
        <code>{dest.vpa}</code>
        <CopyButton value={dest.vpa} label="UPI id" compact />
      </span>
    );
  }
  if (dest.how === 'Bank') {
    return (
      <span className="payto">
        <span className="payto-kind">Bank</span>
        <code>{dest.account}</code>
        <CopyButton value={dest.account} label="account number" compact />
        {dest.ifsc ? <span className="muted small">{dest.ifsc}</span> : null}
      </span>
    );
  }
  return (
    <span className="dest-missing small">
      <Icon name="alert" size={14} /> No account to pay into
    </span>
  );
}

function QueueTable({ rows, rxOn, roles, now }: { rows: { p: QueuedPayout; stage: Stage }[]; rxOn: boolean; roles: Record<string, string[]>; now: Date }) {
  return (
    <div className="table-wrap">
      <table className="table-compact">
        <thead>
          <tr>
            <th className="th">Person</th>
            <th className="th">Asked</th>
            <th className="th">Pay to</th>
            <th className="th num">Amount</th>
            <th className="th">Status</th>
            <th className="th" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, stage }) => {
            const st = stageLabel(p, stage, rxOn);
            const byHand = stage === 'manual' || (stage === 'not-sent' && !rxOn);
            return (
              <ClickRow key={p.id} href={`/payouts/${p.id}`}>
                <td className="td">
                  <PersonLink id={p.user_id} name={p.display_name ?? 'Someone'} />
                  <RoleTag roles={roles[p.user_id]} />
                </td>
                <td className="td nowrap muted" title={istDateTime(p.requested_at)}>
                  {timeAgo(p.requested_at, now)}
                </td>
                <td className="td">
                  <PayTo p={p} />
                </td>
                <td className="td num nowrap">
                  <strong>
                    <Money minor={p.amount_minor} />
                  </strong>
                </td>
                <td className="td">
                  <Pill tone={st.tone}>{st.label}</Pill>
                </td>
                <td className="td right">
                  <Link href={`/payouts/${p.id}`} className={`btn btn-small${byHand ? ' btn-primary' : ''}`}>
                    {byHand ? 'Pay' : 'Open'}
                  </Link>
                </td>
              </ClickRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PayoutsView({
  d,
  mfa,
  checkAll,
  setMethod,
}: {
  d: PayoutsData;
  mfa: MfaState;
  checkAll: FormAction;
  setMethod: FormAction;
}) {
  const now = new Date(d.now);
  const nowMs = now.getTime();
  // RazorpayX sends new withdrawals only when the switch says so AND it is set up.
  const rxOn = d.method === 'razorpayx' && d.rx.configured;
  const rxInFlight = d.queue.some((p) => (p.via ?? 'manual') === 'razorpayx');
  const q = d.q.trim().toLowerCase();
  const match = (name: string | null) => !q || (name ?? '').toLowerCase().includes(q);

  const staged = d.queue.filter((p) => match(p.display_name)).map((p) => ({ p, stage: stageOf(p, nowMs, rxOn) }));
  const needsYou = staged.filter((x) => STAGE[x.stage].needsYou);
  const onTheWay = staged.filter((x) => !STAGE[x.stage].needsYou);
  const needsMinor = needsYou.reduce((a, x) => a + x.p.amount_minor, 0);
  const history = d.history.filter((h) => match(h.name));
  const recentFailures = history.filter((h) => h.status === 'failed' && nowMs - Date.parse(h.updated_at) < 7 * 24 * 60 * MIN);

  const histCounts = {
    all: history.length,
    paid: history.filter((h) => h.status === 'paid').length,
    failed: history.filter((h) => h.status === 'failed').length,
    cancelled: history.filter((h) => h.status === 'cancelled').length,
  };
  const histRows = d.hist === 'all' ? history : history.filter((h) => h.status === d.hist);
  const histPages = Math.max(1, Math.ceil(histRows.length / HIST_PAGE));
  const histPage = Math.min(d.histPage, histPages - 1);
  const histShown = histRows.slice(histPage * HIST_PAGE, (histPage + 1) * HIST_PAGE);

  const href = (over: Record<string, string | number | null>, hash = '') => {
    const p = new URLSearchParams();
    const merged: Record<string, string | number | null> = { days: d.days === 30 ? null : d.days, q: d.q || null, hist: d.hist === 'all' ? null : d.hist, hp: null, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== null && v !== '' && v !== 0) p.set(k, String(v));
    const s = p.toString();
    return `/payouts${s ? `?${s}` : ''}${hash}`;
  };

  const pos = d.position;
  const bal = d.rx.balanceMinor;
  const ready = pos?.readyToWithdrawMinor ?? d.queue.reduce((a, p) => a + p.amount_minor, 0);
  const shortBy = bal != null ? Math.max(ready - bal, 0) : 0;
  const ownMinor = bal != null && pos ? bal - pos.heldForPeopleMinor : null;
  const periodMinor = d.daily.reduce((a, x) => a + x.minor, 0);
  const periodCount = d.daily.reduce((a, x) => a + x.count, 0);
  const oldest = needsYou[0]?.p.requested_at;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Payouts' }]}
        title="Payouts"
        sub={rxOn ? 'RazorpayX sends withdrawals automatically. Anything that needs you is listed first.' : 'Workers and posters asking for their money. Pay each one from your UPI app or bank, then record it.'}
        right={<SearchBox action="/payouts" defaultValue={d.q} placeholder="Find a person" hidden={d.days !== 30 ? { days: String(d.days) } : undefined} />}
      />

      <MoneyLock mfa={mfa} />

      {rxOn && d.rx.error ? (
        <Notice tone="gold" icon="alert" title="Couldn’t read the RazorpayX balance.">
          {d.rx.error}. Withdrawals still go out; only the balance check is missing.
        </Notice>
      ) : rxOn && shortBy > 0 ? (
        <Notice tone="red" title={`RazorpayX is ${inr(shortBy)} short.`}>
          People can withdraw {inr(ready)} right now and the account holds {inr(bal ?? 0)}. Add at least {inr(shortBy)} to the RazorpayX account.
        </Notice>
      ) : null}

      <div className="stats">
        <StatLink href="#queue" icon="clock" label="Waiting for you" value={needsYou.length} sub={needsYou.length ? inr(needsMinor) : 'All paid'} />
        <StatLink href="#on-the-way" icon="send" label="On the way" value={onTheWay.length} sub={onTheWay.length ? inr(onTheWay.reduce((a, x) => a + x.p.amount_minor, 0)) : 'Nothing in flight'} />
        <StatLink href="#history" icon="check" label="Paid today" value={inr(d.totals.todayMinor)} sub={`${d.totals.todayCount} payout${d.totals.todayCount === 1 ? '' : 's'}`} />
        <StatLink href="/users?filter=money" icon="wallet" label="Ready to withdraw" value={inr(ready)} sub="Earnings people can still ask for" />
      </div>

      <Card
        id="queue"
        title={`Needs you${needsYou.length ? ` · ${needsYou.length}` : ''}`}
        sub={
          needsYou.length
            ? `${inr(needsMinor)} to pay · oldest asked ${oldest ? timeAgo(oldest, now) : ''}. Press Pay to see the QR code and account, then record it.`
            : q
              ? `Nobody matching “${d.q}” is waiting.`
              : undefined
        }
        right={
          d.rx.configured && (rxOn || rxInFlight) ? (
            <ConfirmAction
              action={checkAll}
              hidden={{}}
              trigger="Check with RazorpayX"
              tone="quiet"
              title="Send waiting withdrawals and re-check the rest?"
              consequence={<>Withdrawals that haven’t reached RazorpayX are sent now; quiet ones are re-checked. The same key is used every time, so none can be paid twice.</>}
              confirmLabel="Check now"
            />
          ) : q ? (
            <Link href={href({ q: null })} className="btn btn-small">
              Clear search
            </Link>
          ) : undefined
        }
        flush={needsYou.length > 0}
      >
        {needsYou.length ? (
          <QueueTable rows={needsYou} rxOn={rxOn} roles={d.roles} now={now} />
        ) : (
          <Empty title="Nothing to pay right now">
            {rxOn ? 'Withdrawals are going out by themselves. Anything stuck shows up here.' : 'New withdrawal requests from workers and posters appear here.'}
          </Empty>
        )}
      </Card>

      {onTheWay.length ? (
        <Card id="on-the-way" title={`On the way · ${onTheWay.length}`} sub="Sent; waiting for the bank to confirm. Nothing to do unless one gets stuck." flush>
          <QueueTable rows={onTheWay} rxOn={rxOn} roles={d.roles} now={now} />
        </Card>
      ) : null}

      {recentFailures.length ? (
        <Card id="came-back" title={`Came back · ${recentFailures.length}`} sub="Last 7 days. The money is already back in their earnings, so there’s nothing to pay." flush>
          <div className="table-wrap">
            <table className="table-compact">
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">Person</th>
                  <th className="th num">Amount</th>
                  <th className="th">Why</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {recentFailures.map((h) => (
                  <ClickRow key={h.id} href={`/payouts/${h.id}`}>
                    <td className="td nowrap muted">{timeAgo(h.updated_at, now)}</td>
                    <td className="td">
                      <PersonLink id={h.user_id} name={h.name} />
                      <RoleTag roles={d.roles[h.user_id]} />
                    </td>
                    <td className="td num nowrap">
                      <Money minor={h.amount_minor} />
                    </td>
                    <td className="td small">{h.reversed_at ? 'Bank sent it back' : (h.failure_note ?? 'Didn’t go through')}</td>
                    <td className="td right nowrap">
                      <Link href={`/users/${h.user_id}#message`} className="btn btn-small">
                        Message
                      </Link>
                    </td>
                  </ClickRow>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card
        id="history"
        title="Settled"
        sub={`Last 30 days · paid in total ${inr(d.totals.totalMinor)} (${d.totals.totalCount}).`}
        right={
          <Tabs
            label="Show"
            small
            items={(
              [
                ['all', 'All'],
                ['paid', 'Paid'],
                ['failed', 'Came back'],
                ['cancelled', 'Cancelled'],
              ] as const
            ).map(([k, label]) => ({ href: href({ hist: k === 'all' ? null : k }, '#history'), label, active: d.hist === k, count: histCounts[k] }))}
          />
        }
        flush
      >
        {histShown.length ? (
          <div className="table-wrap">
            <table className="table-compact">
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">Person</th>
                  <th className="th num">Amount</th>
                  <th className="th">Result</th>
                  <th className="th">Reference or reason</th>
                </tr>
              </thead>
              <tbody>
                {histShown.map((h) => {
                  const first = h.name.split(' ')[0] ?? h.name;
                  const st = payoutStatus(h.status, first);
                  const label =
                    h.status === 'paid'
                      ? h.via === 'razorpayx'
                        ? 'Paid by RazorpayX'
                        : 'Paid'
                      : h.status === 'failed'
                        ? 'Came back'
                        : h.status === 'cancelled'
                          ? 'Cancelled'
                          : st.label;
                  return (
                    <ClickRow key={h.id} href={`/payouts/${h.id}`}>
                      <td className="td nowrap muted" title={istDateTime(h.updated_at)}>
                        {istDateTime(h.updated_at)}
                      </td>
                      <td className="td">
                        <PersonLink id={h.user_id} name={h.name} />
                      </td>
                      <td className="td num nowrap">
                        <Money minor={h.amount_minor} />
                      </td>
                      <td className="td">
                        <Pill tone={st.tone}>{label}</Pill>
                      </td>
                      <td className="td small muted">{h.reference ?? h.failure_note ?? '—'}</td>
                    </ClickRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={q ? `Nothing settled for “${d.q}”` : 'Nothing here in the last 30 days'} />
        )}
        <Pager page={histPage} pageSize={HIST_PAGE} total={histRows.length} hrefFor={(p) => href({ hp: p }, '#history')} />
      </Card>

      <Card
        id="requests"
        title="Withdrawal requests per day"
        sub={`Last ${d.days} days: ${inr(periodMinor)} in ${periodCount} ${periodCount === 1 ? 'request' : 'requests'}. Click a day to see who asked.`}
        right={<Tabs label="Chart range" small items={[7, 30, 90].map((n) => ({ href: href({ days: n === 30 ? null : n }, '#requests'), label: `${n} days`, active: n === d.days }))} />}
      >
        <LineChart
          labels={d.daily.map((x) => `${x.long} · ${x.count} ${x.count === 1 ? 'request' : 'requests'}`)}
          ticks={d.daily
            .map((x, index) => ({ index, text: x.short }))
            .filter((_, i, all) => i === 0 || i === all.length - 1 || i % Math.max(1, Math.round(all.length / 6)) === 0)}
          series={[{ name: 'Requested', color: CHART_COLORS.total, values: d.daily.map((x) => x.minor), area: true }]}
          summary={`Total withdrawal requests per day, last ${d.days} days.`}
          emptyText="Nobody has asked to withdraw in this range."
          pointHrefs={d.daily.map((x) => href({ days: d.days === 30 ? null : d.days, day: x.key }, '#day'))}
          height={200}
        />
        {d.day ? (
          <div id="day" className="day-list">
            <div className="day-list-head">
              <h3 className="sub-head">
                {d.dayLabel} · {d.dayRows.length} {d.dayRows.length === 1 ? 'request' : 'requests'} · {inr(d.dayRows.reduce((a, r) => a + r.amount_minor, 0))}
              </h3>
              <Link href={href({}, '#requests')} className="btn btn-small" scroll={false}>
                Close
              </Link>
            </div>
            {d.dayRows.length ? (
              <div className="table-wrap">
                <table className="table-compact">
                  <tbody>
                    {d.dayRows.map((r) => {
                      const st = payoutStatus(r.status, r.name.split(' ')[0] ?? r.name);
                      return (
                        <ClickRow key={r.id} href={`/payouts/${r.id}`}>
                          <td className="td nowrap muted">{istDateTime(r.created_at ?? r.updated_at)}</td>
                          <td className="td">
                            <PersonLink id={r.user_id} name={r.name} />
                          </td>
                          <td className="td num nowrap">
                            <Money minor={r.amount_minor} />
                          </td>
                          <td className="td">
                            <Pill tone={st.tone}>{st.label}</Pill>
                          </td>
                        </ClickRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted small">Nobody asked to withdraw that day.</p>
            )}
          </div>
        ) : null}
      </Card>

      <div className="grid-2">
        <Card title="How withdrawals are paid" sub="Applies to every new withdrawal." id="method">
          <div className="method-switch method-switch-tight">
            <div className={`method-option${d.method === 'manual' ? ' on' : ''}`}>
              <div className="method-option-head">
                <strong>Manual</strong>
                {d.method === 'manual' ? <Pill tone="green">In use</Pill> : null}
              </div>
              <p className="muted small">You pay each one yourself and record the reference.</p>
              {d.method !== 'manual' ? (
                <ConfirmAction
                  action={setMethod}
                  hidden={{ method: 'manual' }}
                  trigger="Switch to manual"
                  tone="quiet"
                  title="Pay withdrawals by hand from now on?"
                  consequence={<>New withdrawals will wait here for you. Ones RazorpayX already has keep going through RazorpayX; nothing is sent twice.</>}
                  confirmLabel="Yes, pay by hand"
                />
              ) : null}
            </div>
            <div className={`method-option${d.method === 'razorpayx' ? ' on' : ''}`}>
              <div className="method-option-head">
                <strong>RazorpayX</strong>
                {d.method === 'razorpayx' ? <Pill tone="green">In use</Pill> : !d.rx.configured ? <Pill tone="grey">Not set up</Pill> : null}
              </div>
              <p className="muted small">Sent automatically by IMPS or UPI the moment it’s asked for.</p>
              {d.method !== 'razorpayx' && !d.rx.configured ? (
                <button type="button" className="btn btn-small" disabled title="Add RAZORPAYX_ACCOUNT_NUMBER, the API keys and RAZORPAYX_WEBHOOK_SECRET in Supabase first.">
                  Set up RazorpayX first
                </button>
              ) : null}
              {d.method !== 'razorpayx' && d.rx.configured ? (
                <ConfirmAction
                  action={setMethod}
                  hidden={{ method: 'razorpayx' }}
                  trigger="Switch to RazorpayX"
                  title="Let RazorpayX send withdrawals?"
                  consequence={<>New withdrawals go out straight away, and ones still waiting for you are handed to RazorpayX now. The account must hold enough money.</>}
                  confirmLabel="Yes, use RazorpayX"
                />
              ) : null}
            </div>
          </div>
        </Card>

        <Card title="Money position" sub="Whose money is in the account.">
          <KV
            rows={[
              { label: 'In RazorpayX', value: bal != null ? <Money minor={bal} /> : <span className="muted">{d.rx.configured ? 'Unavailable' : 'Not connected'}</span> },
              { label: 'Ready to withdraw', value: <Money minor={ready} />, hint: 'Earnings plus withdrawals on the way' },
              { label: 'Held for people', value: pos ? <Money minor={pos.heldForPeopleMinor} /> : <span className="muted">—</span> },
              { label: 'TaskDrop’s own', value: ownMinor != null ? <Money minor={ownMinor} /> : <span className="muted">—</span> },
            ]}
          />
          <Link href="/money#whose" className="figure-link">
            Full breakdown →
          </Link>
        </Card>
      </div>

      <HowItWorks
        open={false}
        steps={[
          <>A worker or poster asks to withdraw their earnings to their UPI id or bank account. The money leaves their earnings at once.</>,
          rxOn ? (
            <>RazorpayX sends it, usually within minutes. Or open it and pay it by hand.</>
          ) : (
            <>Press <strong>Pay</strong>, scan the QR with your phone’s UPI app (or copy the bank details), send the money, then record the UTR.</>
          ),
          <>If it can’t be paid, put it back in their earnings with a reason. They’re told why and can ask again.</>,
        ]}
      />
    </>
  );
}
