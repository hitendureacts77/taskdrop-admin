import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { LineChart } from '@/components/LineChart';
import { Delta } from '@/components/ui';
import { earningsChart, rangeTabs, versus } from '@/components/earningsChart';
import type { DashboardData } from '@/components/views/DashboardView';
import type { Movement } from '@/lib/data';
import { inr, istTime, pct, prettyDayKey, timeAgo } from '@/lib/format';
import { payoutStage, PAYOUT_STAGE } from '@/lib/labels';
import { isTestRow, isTestTitle, isTestUserId } from '@/lib/test-data';
import * as v2 from '../ui';
import { DevSignInBlocker, greeting, longDate, TodayStats } from './parts';
import { V2LiveFeed } from './V2LiveFeed';
import { V2NeedsCard } from './V2NeedsList';
import { V2RightNow } from './V2RightNow';
import { V2WhoseMoney } from './V2WhoseMoney';

/**
 * Admin v2 dashboard (07-build-plan-v2.md, WP4). Same reads as today's
 * DashboardView (page.tsx), laid out as the approved design: launch blocker,
 * Right now, Needs you + Things to do + System health, the money tiles, today's
 * counts, earnings with ranges, where today's money came from, live feed,
 * devices and tools, whose money, latest money movements.
 */

const MOVE_TONE: Record<Movement['tone'], v2.Tone> = { green: 'ok', gold: 'wait', blue: 'earn', red: 'danger', grey: 'mut' };

/** A money movement is test data when its link points at a fake seed person or its line names an [e2e] job. */
function isTestMovement(m: Movement): boolean {
  const id = m.href?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  return isTestTitle(m.detail) || (id ? isTestUserId(id) : false);
}

export function V2Dashboard({
  d,
  health,
  devices,
  devSignIn,
  hideTest,
}: {
  d: DashboardData;
  health?: ReactNode;
  devices?: ReactNode;
  devSignIn: boolean | null;
  hideTest: boolean;
}) {
  const now = new Date(d.now);
  const nowMs = Date.parse(d.now);
  const e = d.earnings;
  const chart = earningsChart(e, 'total');

  // Lists respect "Hide test data"; the tiles built from them use the same filtered lists.
  const escrow = hideTest ? d.escrow.filter((j) => !isTestRow({ posterId: j.posterId, userId: j.workerId, title: j.title })) : d.escrow;
  const queue = hideTest ? d.queue.filter((p) => !isTestRow({ userId: p.user_id })) : d.queue;
  const movements = d.movements.map((m) => ({ m, test: isTestMovement(m) })).filter((x) => !hideTest || !x.test);

  const funded = escrow.filter((j) => j.funded);
  const unfunded = escrow.filter((j) => !j.funded);
  const escrowMinor = funded.reduce((a, j) => a + j.escrowMinor, 0);
  const unfundedMinor = unfunded.reduce((a, j) => a + j.escrowMinor, 0);
  const queueMinor = queue.reduce((a, p) => a + p.amount_minor, 0);
  const needsYou = queue.filter((p) => PAYOUT_STAGE[payoutStage(p, nowMs)].needsYou);
  const commissionPct = pct(d.settings.commissionPct);
  const feePct = pct(d.settings.posterFeePct);
  const workerPct = pct(1 - d.settings.commissionPct);
  const since = e.firstEarningDay ? prettyDayKey(e.firstEarningDay) : null;
  const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

  const todo: { label: string; n: number | null; href: string; cta: string }[] = [
    { label: 'withdrawals need you', n: needsYou.length, href: '/needs-you?kind=withdrawal', cta: 'Open' },
    { label: 'disputes need your decision', n: d.disputes, href: '/needs-you?kind=dispute', cta: 'Decide' },
    { label: 'refunds owed to posters', n: d.held.refundsCount, href: '/needs-you?kind=refund', cta: 'Review' },
    { label: 'people asked for help', n: d.support, href: '/needs-you?kind=help', cta: 'Reply' },
  ];

  const split = [
    { k: 'worker_commission', label: 'Commission', hint: `${commissionPct} of each job price`, v: e.today.commission },
    { k: 'poster_fee', label: 'Service fee', hint: `${feePct} extra posters pay`, v: e.today.fee },
    { k: 'ad_revenue', label: 'Promotions', hint: 'posters paying to show higher', v: e.today.promotions },
    { k: 'adjustment', label: 'Corrections', hint: 'manual fixes', v: e.today.other },
  ];
  const splitMax = Math.max(1, ...split.map((s) => Math.abs(s.v)));

  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'Dashboard' }]}
        title={greeting(now)}
        sub={longDate(now)}
        right={
          <span className="wp4-asof">
            Money figures as of {istTime(d.now)} ·{' '}
            <Link href="/" prefetch={false}>
              <Icon name="refresh" size={13} /> Refresh
            </Link>
          </span>
        }
      />

      <DevSignInBlocker on={devSignIn} />

      <V2RightNow />

      <v2.Grid cols="main" className="wp4-mt">
        <V2NeedsCard limit={6} />
        <div className="wp4-side">
          <v2.Card title="Things to do" sub="Each line opens the matching part of Needs you." right={<v2.NewTag />}>
            <ul className="wp4-todo">
              {todo.map((t) => (
                <li key={t.href}>
                  {t.n === null ? (
                    <span className="v2-muted">Refunds owed can’t be counted right now</span>
                  ) : (
                    <span>
                      <b>{t.n.toLocaleString('en-IN')}</b> {t.label}
                    </span>
                  )}
                  {t.n ? (
                    <Link className="v2-btn sm" href={t.href}>
                      {t.cta}
                    </Link>
                  ) : t.n === 0 ? (
                    <v2.Pill tone="ok">All clear</v2.Pill>
                  ) : null}
                </li>
              ))}
            </ul>
          </v2.Card>
          {health}
        </div>
      </v2.Grid>

      <v2.SectionTitle>Money</v2.SectionTitle>
      <v2.Grid cols={4} className="wp4-keep2">
        <v2.Tile
          tone="jade"
          label="TaskDrop’s earnings today"
          value={inr(e.today.total)}
          foot={
            <>
              <Delta current={e.today.total} previous={e.yesterday} versus="yesterday" />
              <br />
              In total{since ? ` since ${since}` : ''}: <b>{inr(d.allTime.total)}</b> from {plural(d.allTime.orders, 'finished job')}, plus promotions
              <br />
              <Link href="/money/entries?when=today">Today’s entries</Link> · <Link href="/money">All earnings</Link>
            </>
          }
        />
        <v2.Tile
          tone="gold"
          label="Held in escrow now"
          value={inr(escrowMinor)}
          foot={
            <>
              {plural(funded.length, 'job')}. Worker gets {workerPct}, TaskDrop keeps {commissionPct} + the {feePct} service fee.
              {unfunded.length ? (
                <>
                  <br />+ {plural(unfunded.length, 'hired job')} not paid for yet ({inr(unfundedMinor)})
                </>
              ) : null}
              <br />
              <Link href="/tasks?filter=escrow">See the {plural(funded.length, 'job')}</Link>
            </>
          }
        />
        <v2.Tile
          tone="blue"
          label="Paid out to people"
          value={inr(d.payoutTotals.todayMinor)}
          foot={
            <>
              Today · {plural(d.payoutTotals.todayCount, 'payout')}
              <br />
              In total · {plural(d.payoutTotals.totalCount, 'payout')} · {inr(d.payoutTotals.totalMinor)}
              <br />
              <Link href="/payouts#history">See every payout</Link>
            </>
          }
        />
        <v2.Tile
          tone={needsYou.length ? 'orange' : undefined}
          label="Withdrawals on the way"
          value={inr(queueMinor)}
          foot={
            queue.length ? (
              <>
                {plural(queue.length, 'withdrawal')} out of people’s earnings{needsYou.length ? (
                  <>
                    {' '}
                    · <b>{needsYou.length} need you</b>
                  </>
                ) : null}
                <br />
                <Link href={needsYou.length ? '/needs-you?kind=withdrawal' : '/payouts'}>{needsYou.length ? 'See what needs you' : 'Open payouts'}</Link>
              </>
            ) : (
              <>
                Nothing on its way.
                <br />
                <Link href="/payouts">Open payouts</Link>
              </>
            )
          }
        />
      </v2.Grid>

      <TodayStats today={d.today} order="money" />

      <v2.Grid cols="main" className="wp4-mt">
        <v2.Card title="What TaskDrop earned" sub="Commission, service fees and promotions, added up. The dashed line is the period before, to compare.">
          <div className="wp4-chart-head">
            <span className="wp4-bignum">{inr(e.sum)}</span>
            {e.prevSum !== null ? <Delta current={e.sum} previous={e.prevSum} versus={versus(e.prevName)} /> : null}
          </div>
          <v2.Chips label="Time range" items={rangeTabs('/', e.range)} />
          <p className="wp4-small v2-muted">
            <b>{chart.name}</b> is {e.span}.{e.prevName && e.prevSpan ? ` ${e.prevName} is ${e.prevSpan}.` : ''}
          </p>
          <LineChart labels={chart.labels} ticks={chart.ticks} series={chart.series} summary={`TaskDrop's earnings, ${chart.name.toLowerCase()}.`} emptyText="Nothing earned in this range yet." />
        </v2.Card>

        <v2.Card title="Where today’s money came from" sub="Tap one to see its entries.">
          {split.map((s) => (
            <Link key={s.k} className="wp4-hbar" href={`/money/entries?when=today&kind=${s.k}`}>
              <span className="l">
                <b>{s.label}</b> <span className="v2-muted">· {s.hint}</span>
              </span>
              <span className="tr" aria-hidden="true">
                <span className="fi" style={{ width: `${Math.max(0, (Math.abs(s.v) / splitMax) * 100)}%` }} />
              </span>
              <span className="v">{inr(s.v)}</span>
            </Link>
          ))}
          <div className="wp4-split-total">
            <b>Earned today</b>
            <b>{inr(e.today.total)}</b>
          </div>
        </v2.Card>
      </v2.Grid>

      <v2.Grid cols="main" className="wp4-mt">
        <V2LiveFeed />
        <div className="wp4-side">{devices}</div>
      </v2.Grid>

      <v2.Grid cols={2} className="wp4-mt">
        <v2.Card title="Whose money is in TaskDrop’s account" id="whose" sub="All of it sits in one account. Each line is who it belongs to.">
          <V2WhoseMoney ownMinor={d.allTime.total} escrowMinor={escrowMinor} held={d.held} queueMinor={queueMinor} clearingDays={d.settings.clearingDays} />
        </v2.Card>
        <v2.Card
          title="Latest money movements"
          sub="What TaskDrop earned and what workers were paid, newest first."
          right={
            <Link className="v2-btn ghost sm" href="/money/entries">
              All entries →
            </Link>
          }
        >
          <v2.DataTable
            columns={[{ label: 'When' }, { label: 'What happened' }, { label: 'Job or person' }, { label: 'Amount', right: true }, { label: 'Status' }]}
            rows={movements.map(({ m, test }, i) => ({
              key: `${m.at}-${i}`,
              href: m.href ?? undefined,
              test,
              cells: [
                <span key="w" className="wp4-small">
                  {timeAgo(m.at, now)}
                </span>,
                m.what,
                m.href ? (
                  <Link key="l" href={m.href}>
                    {m.detail || 'Open'}
                  </Link>
                ) : (
                  m.detail
                ),
                <b key="a">{inr(m.amount)}</b>,
                <v2.Pill key="s" tone={MOVE_TONE[m.tone]}>
                  {m.status}
                </v2.Pill>,
              ],
            }))}
            empty="No money has moved yet. Earnings and payouts show up here as they happen."
          />
        </v2.Card>
      </v2.Grid>

      {hideTest ? (
        <p className="wp4-foot">
          Test data is hidden from the lists, escrow and withdrawals above. Earnings, payouts paid, today’s counts and the Right now numbers are added up by the database and still include it.
        </p>
      ) : null}
    </>
  );
}
