import Link from 'next/link';
import type { AllTime, EscrowJob, MoneyHeld, MoneySettings, Movement, PayoutTotals, QueuedPayout, TodayCounts } from '@/lib/data';
import type { EarningsSeries } from '@/lib/earnings';
import { istTime, pct, prettyDayKey, timeAgo } from '@/lib/format';
import { CHART_COLORS, payoutStage, PAYOUT_STAGE } from '@/lib/labels';
import { ClickCard, ClickRow } from '../Clickable';
import { Icon } from '../Icon';
import { LineChart } from '../LineChart';
import { Card, Delta, Empty, Money, PageHeader, Pill, StatLink, Swatch, Tabs } from '../ui';
import { WhoseMoney } from '../WhoseMoney';
import { earningsChart, rangeTabs, versus } from '../earningsChart';

export type DashboardData = {
  now: string;
  earnings: EarningsSeries;
  allTime: AllTime;
  settings: MoneySettings;
  escrow: EscrowJob[];
  queue: QueuedPayout[];
  payoutTotals: PayoutTotals;
  held: MoneyHeld;
  today: TodayCounts;
  movements: Movement[];
  disputes: number;
  support: number;
};

function greeting(now: Date) {
  const h = Number(now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function DashboardView({ d }: { d: DashboardData }) {
  const now = new Date(d.now);
  const e = d.earnings;
  const chart = earningsChart(e, 'total');
  const funded = d.escrow.filter((j) => j.funded);
  const unfunded = d.escrow.filter((j) => !j.funded);
  const escrowMinor = funded.reduce((a, j) => a + j.escrowMinor, 0);
  const unfundedMinor = unfunded.reduce((a, j) => a + j.escrowMinor, 0);
  const queueMinor = d.queue.reduce((a, p) => a + p.amount_minor, 0);
  const nowMs = Date.parse(d.now);
  const needsYou = d.queue.filter((p) => PAYOUT_STAGE[payoutStage(p, nowMs)].needsYou);
  const commissionPct = pct(d.settings.commissionPct);
  const feePct = pct(d.settings.posterFeePct);
  const workerPct = pct(1 - d.settings.commissionPct);
  const since = e.firstEarningDay ? prettyDayKey(e.firstEarningDay) : null;

  const todo = [
    {
      n: needsYou.length,
      icon: 'send',
      title: needsYou.length === 1 ? '1 withdrawal needs you' : `${needsYou.length} withdrawals need you`,
      sub: needsYou.length
        ? 'Waiting for you to pay by hand, or stuck in RazorpayX.'
        : 'No withdrawals are waiting to be paid.',
      href: '/payouts',
      cta: 'Open',
    },
    {
      n: d.disputes,
      icon: 'scale',
      title: d.disputes === 1 ? '1 dispute needs your decision' : `${d.disputes} disputes need your decision`,
      sub: d.disputes ? 'The money stays frozen until you decide.' : 'No disputes.',
      href: '/disputes',
      cta: 'Decide',
    },
    {
      n: d.held.refundsCount ?? 0,
      icon: 'undo',
      title: d.held.refundsCount === null ? 'Refunds: add the server key to see them' : `${d.held.refundsCount} refund${d.held.refundsCount === 1 ? '' : 's'} owed to posters`,
      sub: d.held.refundsOwed ? <>
          <Money minor={d.held.refundsOwed} /> from cancelled jobs.
        </> : 'Nothing owed.',
      href: '/refunds',
      cta: 'Review',
    },
    {
      n: d.support,
      icon: 'help',
      title: d.support === 1 ? '1 person asked for help' : `${d.support} people asked for help`,
      sub: d.support ? 'Waiting for a reply from you.' : 'Nobody is waiting.',
      href: '/support',
      cta: 'Reply',
    },
  ];
  const openTodos = todo.filter((t) => t.n > 0).length;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Dashboard' }]}
        title="Dashboard"
        sub={`${greeting(now)}. Here is TaskDrop today, ${now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })}.`}
        right={
          <span className="updated">
            Updated {istTime(d.now)} ·{' '}
            <Link href="/" prefetch={false}>
              <Icon name="refresh" size={14} /> Refresh
            </Link>
          </span>
        }
      />

      <div className="tiles">
        <ClickCard className="tile tile-earn" href="/money">
          <div className="tile-body">
            <div className="tile-label">
              <Icon name="bank" size={18} /> TaskDrop’s earnings
            </div>
            <div className="tile-pair">
              <div>
                <span className="tile-cap">Today</span>
                <Money minor={e.today.total} className="tile-num" />
                <Delta current={e.today.total} previous={e.yesterday} versus="yesterday" onDark />
              </div>
              <div>
                <span className="tile-cap">In total{since ? ` · since ${since}` : ''}</span>
                <Money minor={d.allTime.total} className="tile-num" />
                <span className="tile-note">
                  From {d.allTime.orders.toLocaleString('en-IN')} finished job{d.allTime.orders === 1 ? '' : 's'}, plus promotions
                </span>
              </div>
            </div>
          </div>
          <div className="tile-foot two">
            <Link href="/money/entries?when=today">
              Today’s entries <Icon name="arrow" size={14} />
            </Link>
            <Link href="/money">
              All earnings <Icon name="arrow" size={14} />
            </Link>
          </div>
        </ClickCard>

        <ClickCard className="tile tile-escrow" href="/tasks?filter=escrow">
          <div className="tile-body">
            <div className="tile-label">
              <Icon name="shield" size={18} /> Held in escrow now
            </div>
            <Money minor={escrowMinor} className="tile-num" />
            <p className="tile-text">
              Posters’ money for <strong>{funded.length} job{funded.length === 1 ? '' : 's'}</strong>. It sits in TaskDrop’s account but is not TaskDrop’s:
              when the poster approves, the worker gets {workerPct} and TaskDrop keeps {commissionPct} plus the service fee.
            </p>
            {unfunded.length ? (
              <p className="tile-note">
                + {unfunded.length} hired job{unfunded.length === 1 ? '' : 's'} not paid for yet (<Money minor={unfundedMinor} />)
              </p>
            ) : null}
          </div>
          <div className="tile-foot">
            <Link href="/tasks?filter=escrow">
              See the {funded.length} job{funded.length === 1 ? '' : 's'} <Icon name="arrow" size={14} />
            </Link>
          </div>
        </ClickCard>

        <ClickCard className="tile tile-paid" href="/payouts#history">
          <div className="tile-body">
            <div className="tile-label">
              <Icon name="send" size={18} /> Paid out to people
            </div>
            <div className="tile-pair">
              <div>
                <span className="tile-cap">Today · {d.payoutTotals.todayCount} payout{d.payoutTotals.todayCount === 1 ? '' : 's'}</span>
                <Money minor={d.payoutTotals.todayMinor} className="tile-num" />
              </div>
              <div>
                <span className="tile-cap">In total · {d.payoutTotals.totalCount} payout{d.payoutTotals.totalCount === 1 ? '' : 's'}</span>
                <Money minor={d.payoutTotals.totalMinor} className="tile-num" />
              </div>
            </div>
          </div>
          <div className="tile-foot">
            <Link href="/payouts#history">
              See every payout <Icon name="arrow" size={14} />
            </Link>
          </div>
        </ClickCard>

        <ClickCard className={`tile ${needsYou.length ? 'tile-send' : 'tile-calm'}`} href="/payouts">
          <div className="tile-body">
            <div className="tile-label">
              <Icon name="clock" size={18} /> Withdrawals on the way
            </div>
            <Money minor={queueMinor} className="tile-num" />
            <p className="tile-text">
              {d.queue.length
                ? `${d.queue.length} withdrawal${d.queue.length === 1 ? '' : 's'} already out of people’s earnings, waiting to be paid${needsYou.length ? `; ${needsYou.length} need${needsYou.length === 1 ? 's' : ''} you` : ''}.`
                : 'No withdrawal is on its way. New requests appear here to be paid by hand or sent by RazorpayX.'}
            </p>
          </div>
          <div className="tile-foot">
            <Link href="/payouts">
              {needsYou.length ? 'See what needs you' : 'Open payouts'} <Icon name="arrow" size={14} />
            </Link>
          </div>
        </ClickCard>
      </div>

      <div className="stats">
        <StatLink href="/tasks?filter=finished_today" icon="check" label="Jobs finished today" value={d.today.jobsFinished} />
        <StatLink href="/tasks?filter=posted_today" icon="jobs" label="Jobs posted today" value={d.today.jobsPosted} />
        <StatLink href="/users?filter=new_today" icon="people" label="New people today" value={d.today.newPeople} />
        <StatLink href="/users?filter=available" icon="bolt" label="Workers available now" value={d.today.availableNow} />
        <StatLink href="/tasks?filter=waiting" icon="clock" label="Waiting for poster’s OK" value={d.today.waitingApproval} />
      </div>

      <div className="grid-main-side">
        <Card
          title="What TaskDrop earned"
          sub="Commission, service fees and promotions, added up."
          right={<Tabs label="Time range" items={rangeTabs('/', e.range)} small />}
        >
          <div className="chart-head">
            <Money minor={e.sum} className="big-num" />
            {e.prevSum !== null ? <Delta current={e.sum} previous={e.prevSum} versus={versus(e.prevName)} /> : null}
          </div>
          <p className="chart-explain">
            <Swatch color={CHART_COLORS.total} /> <strong>{chart.name}</strong> is {e.span}.
            {e.prevName && e.prevSpan ? (
              <>
                {' '}
                <Swatch color={CHART_COLORS.previous} /> <strong>{e.prevName}</strong> is {e.prevSpan}, shown so you can compare.
              </>
            ) : null}
          </p>
          <LineChart
            labels={chart.labels}
            ticks={chart.ticks}
            series={chart.series}
            summary={`TaskDrop's earnings, ${chart.name.toLowerCase()}.`}
            emptyText="Nothing earned in this range yet."
          />
        </Card>

        <Card title="Where today’s money came from" sub="The three ways TaskDrop earns. Tap one to see the entries.">
          <ul className="split-list">
            {[
              { k: 'worker_commission', label: 'Commission', hint: `${commissionPct} of the job price, taken when the poster approves`, v: e.today.commission, c: CHART_COLORS.commission },
              { k: 'poster_fee', label: 'Service fee', hint: `${feePct} extra that posters pay on top`, v: e.today.fee, c: CHART_COLORS.fee },
              { k: 'ad_revenue', label: 'Promotions', hint: 'Posters paying to show their job higher', v: e.today.promotions, c: CHART_COLORS.promotions },
              ...(e.today.other ? [{ k: 'adjustment', label: 'Corrections', hint: 'Manual fixes to the books', v: e.today.other, c: '#6b6b6b' }] : []),
            ].map((row) => (
              <li key={row.k}>
                <Link href={`/money/entries?when=today&kind=${row.k}`} className="split-row">
                  <Swatch color={row.c} />
                  <span className="split-text">
                    <strong>{row.label}</strong>
                    <span>{row.hint}</span>
                  </span>
                  <Money minor={row.v} className="split-num" />
                </Link>
                <span className="split-bar" aria-hidden="true">
                  <span style={{ width: `${e.today.total > 0 ? Math.max(0, (row.v / e.today.total) * 100) : 0}%`, background: row.c }} />
                </span>
              </li>
            ))}
          </ul>
          <div className="split-total">
            <span>Earned today</span>
            <Money minor={e.today.total} />
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Things to do" right={<Pill tone={openTodos ? 'gold' : 'green'}>{openTodos ? `${openTodos} need you` : 'All clear'}</Pill>}>
          <ul className="todo">
            {todo.map((t) => (
              <ClickCard as="li" key={t.href} className={t.n ? undefined : 'todo-done'} href={t.href}>
                <span className="todo-icon" aria-hidden="true">
                  <Icon name={t.n ? t.icon : 'check'} size={18} />
                </span>
                <span className="todo-text">
                  <strong>{t.title}</strong>
                  <span>{t.sub}</span>
                </span>
                <Link className={t.n ? 'btn btn-primary btn-small' : 'btn btn-small'} href={t.href}>
                  {t.n ? t.cta : 'Open'}
                </Link>
              </ClickCard>
            ))}
          </ul>
        </Card>

        <Card title="Whose money is in TaskDrop’s account" sub="All of it sits in one account. The panel keeps track of who each rupee belongs to.">
          <WhoseMoney ownMinor={d.allTime.total} escrowMinor={escrowMinor} held={d.held} queueMinor={queueMinor} clearingDays={d.settings.clearingDays} />
        </Card>
      </div>

      <Card title="Latest money movements" sub="What TaskDrop earned and what workers were paid, newest first." right={<Link href="/money/entries">All entries →</Link>} flush>
        {d.movements.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">What happened</th>
                  <th className="th">Job or person</th>
                  <th className="th num">Amount</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.movements.map((m, i) => {
                  const cells = (
                    <>
                      <td className="td nowrap muted">{timeAgo(m.at, now)}</td>
                      <td className="td">{m.what}</td>
                      <td className="td">{m.href ? <Link href={m.href}>{m.detail || 'Open'}</Link> : m.detail}</td>
                      <td className="td num">
                        <Money minor={m.amount} />
                      </td>
                      <td className="td">
                        <Pill tone={m.tone}>{m.status}</Pill>
                      </td>
                    </>
                  );
                  return m.href ? (
                    <ClickRow key={i} href={m.href}>
                      {cells}
                    </ClickRow>
                  ) : (
                    <tr key={i}>{cells}</tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No money has moved yet">Earnings and payouts will show up here as they happen.</Empty>
        )}
      </Card>
    </>
  );
}
