import Link from 'next/link';
import type { AllTime, EscrowJob, LedgerEntry, MoneyHeld, MoneySettings } from '@/lib/data';
import type { EarningsSeries, RangeKey, Split } from '@/lib/earnings';
import { istDateTime, pct, prettyDayKey } from '@/lib/format';
import { CHART_COLORS, ledgerKind, taskStatus } from '@/lib/labels';
import { Icon } from '../Icon';
import { LineChart } from '../LineChart';
import { Card, Delta, Empty, HowItWorks, JobLink, Money, Notice, PageHeader, PersonLink, Pill, Swatch, Tabs } from '../ui';
import { WhoseMoney } from '../WhoseMoney';
import { currentName, earningsChart, rangeTabs, versus } from '../earningsChart';

export type MoneyData = {
  now: string;
  view: 'total' | 'types';
  earnings: EarningsSeries;
  allSplit: Split;
  allTime: AllTime;
  settings: MoneySettings;
  escrow: EscrowJob[];
  held: MoneyHeld;
  queueMinor: number;
  ledger: LedgerEntry[];
};

const WHEN_FOR: Partial<Record<RangeKey, string>> = { '7d': '7d', month: 'month', lastmonth: 'lastmonth' };

function nextStep(j: EscrowJob, now: Date): string {
  if (!j.funded) return 'Poster hasn’t paid yet, so nothing is held.';
  if (j.taskStatus === 'DISPUTED') return 'Frozen until an admin decides the dispute.';
  if (j.taskStatus === 'WORK_DONE' && j.autoCompleteAt) {
    const at = new Date(j.autoCompleteAt);
    return at > now ? `Releases on its own ${istDateTime(j.autoCompleteAt)} unless the poster replies.` : 'Due to release automatically.';
  }
  if (j.taskStatus === 'OVERDUE') return 'Running late. Held until the work is done or the job is cancelled.';
  return 'Held until the worker finishes and the poster approves.';
}

export function MoneyView({ d }: { d: MoneyData }) {
  const now = new Date(d.now);
  const e = d.earnings;
  const s = d.settings;
  const chart = earningsChart(e, d.view);
  const funded = d.escrow.filter((j) => j.funded);
  const unfunded = d.escrow.filter((j) => !j.funded);
  const escrowMinor = funded.reduce((a, j) => a + j.escrowMinor, 0);
  const soon = funded.filter((j) => j.taskStatus === 'WORK_DONE' && j.autoCompleteAt && new Date(j.autoCompleteAt).getTime() - now.getTime() < 86400000);
  const soonMinor = soon.reduce((a, j) => a + j.escrowMinor, 0);
  const rangeName = currentName(e.range, now);
  const when = WHEN_FOR[e.range];
  const since = e.firstEarningDay ? prettyDayKey(e.firstEarningDay) : null;

  const kinds: { k: string; key: keyof Split; color: string; hint: string }[] = [
    { k: 'worker_commission', key: 'commission', color: CHART_COLORS.commission, hint: `${pct(s.commissionPct)} of the job price, taken when the poster approves` },
    { k: 'poster_fee', key: 'fee', color: CHART_COLORS.fee, hint: `${pct(s.posterFeePct)} extra that posters pay on top of the price` },
    { k: 'ad_revenue', key: 'promotions', color: CHART_COLORS.promotions, hint: 'Posters paying to show their job higher' },
    { k: 'adjustment', key: 'other', color: '#6b6b6b', hint: 'Manual fixes to the books' },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Earnings & escrow' }]}
        title="Earnings & escrow"
        sub="What TaskDrop has earned, the posters’ money it is holding, and who every rupee in the account belongs to."
      />

      <HowItWorks
        title="How money moves through TaskDrop"
        steps={[
          <>
            A poster pays the job price plus a <strong>{pct(s.posterFeePct)} service fee</strong>. TaskDrop holds it. This is called <strong>escrow</strong>.
          </>,
          <>The worker does the job and marks it done.</>,
          <>
            The poster approves, or {s.reviewDays} days pass with no reply. The worker gets <strong>{pct(1 - s.commissionPct)}</strong> of the price in their TaskDrop
            wallet. TaskDrop keeps <strong>{pct(s.commissionPct)} commission</strong> plus the service fee.
          </>,
          <>
            {s.clearingDays > 0 ? `${s.clearingDays} days later` : 'Straight away'} the worker can withdraw. RazorpayX sends it to their bank or UPI; follow it
            on <Link href="/payouts">Worker payouts</Link>.
          </>,
        ]}
      />

      <Card title="1. What TaskDrop earned" sub="TaskDrop’s own money: commission, service fees and promotions.">
        <div className="figures">
          <div className="figure">
            <span className="figure-label">
              <Icon name="clock" size={16} /> Earned today
            </span>
            <Money minor={e.today.total} className="figure-num" />
            <Delta current={e.today.total} previous={e.yesterday} versus="yesterday" />
            <Link href="/money/entries?when=today" className="figure-link">
              Today’s entries →
            </Link>
          </div>
          <div className="figure">
            <span className="figure-label">
              <Icon name="chart" size={16} /> {rangeName}
            </span>
            <Money minor={e.sum} className="figure-num" />
            {e.prevSum !== null ? <Delta current={e.sum} previous={e.prevSum} versus={versus(e.prevName)} /> : <span className="muted small">{e.span}</span>}
            <Link href={`/money/entries?when=${when ?? 'all'}`} className="figure-link">
              Entries →
            </Link>
          </div>
          <div className="figure">
            <span className="figure-label">
              <Icon name="bank" size={16} /> Earned in total
            </span>
            <Money minor={d.allTime.total} className="figure-num" />
            <span className="muted small">
              {since ? `Since ${since}` : 'Nothing yet'} · {d.allTime.orders.toLocaleString('en-IN')} finished job{d.allTime.orders === 1 ? '' : 's'}
            </span>
            <Link href="/money/entries?when=all" className="figure-link">
              All entries →
            </Link>
          </div>
        </div>

        <h3 className="sub-head">Where the earnings came from</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="th">Type</th>
                <th className="th num">Today</th>
                <th className="th num">{rangeName}</th>
                <th className="th num">In total</th>
              </tr>
            </thead>
            <tbody>
              {kinds
                .filter((k) => k.key !== 'other' || d.allSplit.other !== 0)
                .map((k) => (
                  <tr key={k.k}>
                    <td className="td">
                      <span className="type-cell">
                        <Swatch color={k.color} />
                        <span>
                          <strong>{ledgerKind(k.k).label}</strong>
                          <span className="muted small block">{k.hint}</span>
                        </span>
                      </span>
                    </td>
                    <td className="td num">
                      <Link href={`/money/entries?when=today&kind=${k.k}`}>
                        <Money minor={e.today[k.key]} />
                      </Link>
                    </td>
                    <td className="td num">
                      <Link href={`/money/entries?when=${when ?? 'all'}&kind=${k.k}`}>
                        <Money minor={e.rangeSplit[k.key]} />
                      </Link>
                    </td>
                    <td className="td num">
                      <Link href={`/money/entries?when=all&kind=${k.k}`}>
                        <Money minor={d.allSplit[k.key]} />
                      </Link>
                    </td>
                  </tr>
                ))}
              <tr className="row-total">
                <td className="td">Total</td>
                <td className="td num">
                  <Money minor={e.today.total} />
                </td>
                <td className="td num">
                  <Money minor={e.sum} />
                </td>
                <td className="td num">
                  <Money minor={d.allTime.total} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Earnings over time"
        sub={d.view === 'types' ? 'Commission, service fee and promotions shown separately.' : 'All three added up, with a comparison line.'}
        right={
          <div className="head-controls">
            <Tabs
              label="Chart view"
              small
              items={[
                { href: `/money?range=${e.range}`, label: 'Total', active: d.view === 'total' },
                { href: `/money?range=${e.range}&view=types`, label: 'By type', active: d.view === 'types' },
              ]}
            />
            <Tabs label="Time range" small items={rangeTabs('/money', e.range, { view: d.view === 'types' ? 'types' : undefined })} />
          </div>
        }
      >
        <div className="chart-head">
          <Money minor={e.sum} className="big-num" />
          <span className="muted">earned · {e.span}</span>
        </div>
        {d.view === 'total' && e.prevName && e.prevSpan ? (
          <p className="chart-explain">
            <Swatch color={CHART_COLORS.total} /> <strong>{chart.name}</strong> is {e.span}. <Swatch color={CHART_COLORS.previous} /> <strong>{e.prevName}</strong> is{' '}
            {e.prevSpan}, so you can compare like with like.
          </p>
        ) : null}
        <LineChart labels={chart.labels} ticks={chart.ticks} series={chart.series} summary={`TaskDrop's earnings, ${chart.name.toLowerCase()}.`} emptyText="Nothing earned in this range yet." />
      </Card>

      <Card id="escrow" title="2. Money in escrow (held for posters)" sub="Posters’ money for jobs that are not finished yet.">
        <Notice tone="blue" icon="shield" title="Is this TaskDrop’s money? Not yet.">
          Escrow is not a separate bank account. It is the part of the money in TaskDrop’s account that still belongs to posters. When a poster approves, it
          becomes the worker’s ({pct(1 - s.commissionPct)}) and TaskDrop’s ({pct(s.commissionPct)} + fee). If the job is cancelled, it goes back to the poster.
        </Notice>
        <div className="figures">
          <div className="figure">
            <span className="figure-label">
              <Icon name="shield" size={16} /> Held right now
            </span>
            <Money minor={escrowMinor} className="figure-num" />
            <span className="muted small">
              {funded.length} job{funded.length === 1 ? '' : 's'} the poster has paid for
            </span>
            <Link href="/tasks?filter=escrow" className="figure-link">
              See these jobs →
            </Link>
          </div>
          <div className="figure">
            <span className="figure-label">
              <Icon name="clock" size={16} /> Releases in the next 24 hours
            </span>
            <Money minor={soonMinor} className="figure-num" />
            <span className="muted small">
              {soon.length} job{soon.length === 1 ? '' : 's'} where the poster hasn’t replied in time
            </span>
          </div>
          <div className="figure">
            <span className="figure-label">
              <Icon name="jobs" size={16} /> Hired, not paid for yet
            </span>
            <span className="figure-num plain">{unfunded.length}</span>
            <span className="muted small">No money held for these until the poster pays.</span>
          </div>
        </div>

        {d.escrow.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Job</th>
                  <th className="th">Poster</th>
                  <th className="th">Worker</th>
                  <th className="th">Status</th>
                  <th className="th num">Held</th>
                  <th className="th">What happens next</th>
                </tr>
              </thead>
              <tbody>
                {[...funded, ...unfunded].map((j) => {
                  const st = taskStatus(j.taskStatus);
                  return (
                    <tr key={j.assignmentId}>
                      <td className="td">
                        <JobLink id={j.taskId} title={j.title} />
                      </td>
                      <td className="td">
                        <PersonLink id={j.posterId} name={j.poster} />
                      </td>
                      <td className="td">
                        <PersonLink id={j.workerId} name={j.worker} />
                      </td>
                      <td className="td">
                        <Pill tone={st.tone} title={st.hint}>
                          {st.label}
                        </Pill>
                      </td>
                      <td className="td num">{j.funded ? <Money minor={j.escrowMinor} /> : <span className="muted">Not paid</span>}</td>
                      <td className="td small">{nextStep(j, now)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing is held right now">When a poster pays for a hired job, it shows up here until the work is approved.</Empty>
        )}
      </Card>

      <Card
        id="whose"
        title="3. Who the money in the account belongs to"
        sub="Razorpay settles every payment into TaskDrop’s one bank account. The panel keeps track of whose each rupee is."
      >
        <WhoseMoney ownMinor={d.allTime.total} escrowMinor={escrowMinor} held={d.held} queueMinor={d.queueMinor} clearingDays={s.clearingDays} />
      </Card>

      <Card title="Latest earnings entries" sub="Each line is one earning booked to TaskDrop, with the job it came from." right={<Link href="/money/entries">All entries →</Link>} flush>
        {d.ledger.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">Type</th>
                  <th className="th">Job</th>
                  <th className="th num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {d.ledger.map((l) => {
                  const k = ledgerKind(l.kind);
                  return (
                    <tr key={l.id}>
                      <td className="td nowrap">{istDateTime(l.at)}</td>
                      <td className="td">
                        <Pill tone={k.tone}>{k.label}</Pill>
                      </td>
                      <td className="td">{l.taskId ? <JobLink id={l.taskId} title={l.title ?? l.note ?? 'Job'} /> : l.note ?? '—'}</td>
                      <td className="td num">
                        <Money minor={l.amount} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No earnings booked yet">The first line appears when a poster approves a finished job.</Empty>
        )}
      </Card>
    </>
  );
}
