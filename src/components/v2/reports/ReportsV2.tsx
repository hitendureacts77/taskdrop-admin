/**
 * Admin v2 Business reports (WP7, F170–F192). Same data as today's
 * ReportsView + GrowthReports; only shown on the v2 path of /reports.
 */
import type { ReactNode } from 'react';
import * as v2 from '@/components/v2/ui';
import { LineChart } from '@/components/LineChart';
import type { PlatformStats } from '@/lib/data/totals';
import type { PromoRoi, Read } from '@/lib/growth';
import { formatWait, funnelSteps, marketplaceShown, retentionGrid, totalDaily, type DailyRow, type FunnelRow, type MarketplaceRow, type MarketplaceShown, type RetentionRow } from '@/lib/growth-calc';
import { CHART_COLORS } from '@/lib/labels';
import { inr, istDate, pct } from '@/lib/format';
import { changePct, chartBuckets, chartUnit, quotedShare, retentionTint } from '@/lib/ops-reports';

const n = (x: number) => x.toLocaleString('en-IN');
const share = (x: number | null) => (x === null ? '—' : pct(x));
const PERIODS: [number, string][] = [
  [7, '7 days'],
  [30, '30 days'],
  [90, '90 days'],
  [365, '1 year'],
];

/** A row in "Compared with the days before": label, value, and the change. */
function Change({ label, value, now, before, note }: { label: ReactNode; value: ReactNode; now?: number; before?: number; note?: ReactNode }) {
  const c = now === undefined || before === undefined ? undefined : changePct(now, before);
  return (
    <div className="wp7-chg">
      <span>
        {label}
        {note ? <span className="wp7-note">{note}</span> : null}
      </span>
      <span className="wp7-chg-v">
        <b>{value}</b>
        {c === undefined ? null : c === null ? (
          <span className="wp7-delta">nothing before</span>
        ) : c === 0 ? (
          <span className="wp7-delta">same as before</span>
        ) : (
          <span className={`wp7-delta ${c > 0 ? 'up' : c < 0 ? 'down' : ''}`}>
            {c > 0 ? '▲' : c < 0 ? '▼' : ''} {Math.abs(c)}% vs before
          </span>
        )}
      </span>
    </div>
  );
}

function Problem({ read, what, detail }: { read: { setup: boolean; error: string | null }; what: string; detail: string }) {
  if (read.setup) return <v2.SetupNotice what={what} detail={detail} />;
  if (read.error) return <v2.ErrorState title={`Could not load ${what.toLowerCase()}`} detail={read.error} />;
  return null;
}

function marketRows(rows: MarketplaceShown[]): v2.Row[] {
  return rows.map((r) => ({
    key: r.label,
    cells: [<b key="l">{r.label}</b>, n(r.posted), share(r.offerRate), formatWait(r.medianFirstOfferSeconds), formatWait(r.p90FirstOfferSeconds), share(r.fillRate)],
  }));
}

const MARKET_COLS = (first: string): v2.Column[] => [
  { label: first },
  { label: 'Posted', right: true },
  { label: 'Got an offer', right: true },
  { label: 'Typical wait' },
  { label: 'Slowest 1 in 10' },
  { label: 'Filled', right: true },
];

export function ReportsV2({
  days,
  s,
  earnedMinor,
  daily,
  previous,
  funnel,
  retention,
  promo,
  marketplace,
  hideTest,
}: {
  days: number;
  s: PlatformStats;
  earnedMinor: number;
  daily: Read<DailyRow[]>;
  previous: Read<DailyRow[]>;
  funnel: Read<FunnelRow | null>;
  retention: Read<RetentionRow[]>;
  promo: Read<PromoRoi | null>;
  marketplace: Read<MarketplaceRow[]>;
  hideTest: boolean;
}) {
  const per = days === 365 ? '1 year' : `${days} days`;
  const dailyOk = !daily.setup && !daily.error;
  const t = totalDaily(daily.data);
  const p = totalDaily(previous.data);
  const pOk = !previous.setup && !previous.error;
  const buckets = chartBuckets(daily.data, days);
  const unit = chartUnit(days);
  const tickEvery = Math.max(1, Math.ceil(buckets.length / 6));
  const ticks = buckets.flatMap((b, i) => (i % tickEvery === 0 ? [{ index: i, text: b.label }] : []));
  const steps = funnel.data ? funnelSteps(funnel.data) : [];
  const grid = retentionGrid(retention.data);
  const mOk = !marketplace.setup && !marketplace.error;
  const all = mOk ? marketplaceShown(marketplace.data, 'all')[0] : undefined;
  const categories = mOk ? marketplaceShown(marketplace.data, 'category') : [];
  const areas = mOk ? marketplaceShown(marketplace.data, 'area').slice(0, 15) : [];

  return (
    <div className="wp7">
      <v2.PageHeader
        title="Business reports"
        sub={`How TaskDrop did over the last ${per}. Every number opens the list behind it.`}
        crumbs={[{ label: 'Reports & settings', href: '/reports' }, { label: 'Business reports' }]}
        right={
          <a className="v2-btn sm" href={`/api/reports/export?days=${days}`} download>
            Download as spreadsheet
          </a>
        }
      />
      <v2.Chips label="Period" items={PERIODS.map(([d, label]) => ({ href: `/reports?days=${d}`, label, active: d === days }))} />

      {hideTest ? (
        <v2.Note tone="blue" title="Test data is still counted here">
          These totals come straight from the database, so they include seed people and test jobs even while Hide test data is on.
        </v2.Note>
      ) : null}

      <v2.SectionTitle>Money</v2.SectionTitle>
      <v2.Grid cols={2}>
        <v2.Tile label="Value of jobs finished" value={inr(s.gmvMinor)} tone="gold" href="/tasks?filter=finished" foot="Agreed prices of jobs approved in this period · open →" />
        <v2.Tile label="TaskDrop earned" value={inr(earnedMinor)} tone="jade" href="/money/entries" foot="Commission, service fees and promotions · open →" />
      </v2.Grid>

      <v2.Grid cols={5} className="wp7-mt">
        <v2.Tile small label="Jobs posted" value={n(s.tasksPosted)} href="/tasks" />
        <v2.Tile small label="Jobs finished" value={n(s.tasksCompleted)} href="/tasks?filter=finished" />
        <v2.Tile small label="Jobs cancelled" value={n(s.tasksCancelled)} foot="posted any time" href="/tasks?filter=cancelled" />
        <v2.Tile small label="Getting quotes now" value={n(s.tasksOpen)} href="/tasks?filter=open" />
        <v2.Tile small label="Open disputes" value={n(s.disputesOpen)} href="/disputes" />
      </v2.Grid>
      <v2.Grid cols={4} className="wp7-mt">
        <v2.Tile small label="Quotes sent" value={n(s.quotesPlaced)} foot={`${pct(quotedShare(s.quotedRate))} of jobs got a quote`} href="/tasks" />
        <v2.Tile small label="New people" value={n(s.newUsers)} href="/users?filter=new_today" />
        <v2.Tile small label="People in total" value={n(s.totalUsers)} foot={`${n(s.activeUsers)} active in the period`} href="/users" />
        <v2.Tile small label="Average worker rating" value={s.avgWorkerRating ? `${s.avgWorkerRating.toFixed(1)}★` : '—'} href="/users?filter=workers" />
      </v2.Grid>

      {!dailyOk ? (
        <div className="wp7-mt">
          <Problem read={daily} what="Business analytics (chart, comparison, health, retention)" detail="admin_business_daily" />
        </div>
      ) : (
        <>
          <v2.Grid cols="main" className="wp7-mt">
            <v2.Card title="How the business is doing" sub={`Per ${unit}, last ${per}. “Paid in for jobs” is money customers paid to fund jobs.`}>
              <LineChart
                labels={buckets.map((b) => b.label)}
                ticks={ticks}
                height={240}
                summary={`Money paid in for jobs and TaskDrop’s earnings per ${unit} for the last ${per}.`}
                series={[
                  { name: 'Paid in for jobs', color: CHART_COLORS.escrow, values: buckets.map((b) => b.fundedMinor), area: true },
                  { name: 'TaskDrop earned', color: CHART_COLORS.total, values: buckets.map((b) => b.revenueMinor) },
                ]}
                emptyText="No money has come in for this period."
              />
            </v2.Card>
            <v2.Card title="Compared with the days before" sub={pOk ? `Against the ${per} before.` : 'The days before could not be read.'}>
              <Change label="Paid in for jobs" value={inr(t.fundedMinor)} now={t.fundedMinor} before={pOk ? p.fundedMinor : undefined} />
              <Change label="TaskDrop earned" value={inr(t.revenueMinor)} now={t.revenueMinor} before={pOk ? p.revenueMinor : undefined} />
              <Change label="Take rate" value={share(t.takeRate)} note={`earned ÷ paid in${pOk ? ` · before: ${share(p.takeRate)}` : ''}`} />
              <Change label="Jobs finished" value={n(t.jobsFinished)} now={t.jobsFinished} before={pOk ? p.jobsFinished : undefined} />
              <Change label="New people" value={n(t.newPeople)} now={t.newPeople} before={pOk ? p.newPeople : undefined} />
              <Change label="Jobs posted" value={n(t.jobsPosted)} now={t.jobsPosted} before={pOk ? p.jobsPosted : undefined} />
            </v2.Card>
          </v2.Grid>

          <v2.Grid cols={2} className="wp7-mt">
            <v2.Card title="Health of the marketplace" sub="Rates look at the jobs posted in this period. Shown as — when there is nothing to divide by.">
              <Change label="Jobs finished ÷ posted" value={share(t.finishRate)} note={pOk ? `before: ${share(p.finishRate)}` : undefined} />
              <Change label="Cancelled ÷ posted" value={`${share(t.cancelRate)} (${n(t.cancellations)})`} note={pOk ? `before: ${share(p.cancelRate)}` : undefined} />
              <Change label="Disputes decided" value={`${n(t.disputesDecided)} · ${share(t.disputeRate)}`} note="share of jobs that ended" now={t.disputesDecided} before={pOk ? p.disputesDecided : undefined} />
              <Change
                label={
                  <>
                    Wallet top-ups <v2.OldTag />
                  </>
                }
                value={inr(t.topupMinor)}
                note="Always ₹0 under Pay per task."
              />
            </v2.Card>
            {mOk ? (
              <v2.Card title="Do tasks get offers, and get done?" sub="Wait is counted only for tasks that got an offer. A task still being worked on counts as not filled yet.">
                {all && all.posted > 0 ? (
                  <v2.KV
                    rows={[
                      ['Time to first offer', `${formatWait(all.medianFirstOfferSeconds)} typical · slowest 1 in 10: ${formatWait(all.p90FirstOfferSeconds)}`],
                      ['Fill rate', `${share(all.fillRate)} of jobs done and paid (${n(all.filled)} of ${n(all.posted)})`],
                      ['Got at least one offer', `${share(all.offerRate)} of jobs (${n(all.withOffer)} of ${n(all.posted)})`],
                    ]}
                  />
                ) : (
                  <v2.Empty title="No tasks were posted in this period" />
                )}
              </v2.Card>
            ) : (
              <Problem read={marketplace} what="The marketplace numbers" detail="admin_marketplace_numbers" />
            )}
          </v2.Grid>
        </>
      )}

      {mOk ? (
        <>
          <div className="wp7-mt">
            <v2.Card title="By category" sub="Tasks without a category are grouped as “Uncategorised”.">
              <v2.DataTable columns={MARKET_COLS('Category')} rows={marketRows(categories)} empty="No tasks in this period" />
            </v2.Card>
          </div>
          <div className="wp7-mt">
            <v2.Card title="By area (top 15)" sub="Areas as people typed them.">
              <v2.DataTable columns={MARKET_COLS('Area')} rows={marketRows(areas)} empty="No tasks in this period" />
            </v2.Card>
          </div>
        </>
      ) : dailyOk ? null : (
        <div className="wp7-mt">
          <Problem read={marketplace} what="The marketplace numbers" detail="admin_marketplace_numbers" />
        </div>
      )}

      <v2.Grid cols={2} className="wp7-mt">
        <v2.Card title="From joining to coming back" sub="Each step: people, % of everyone who joined, % of the step before.">
          {funnel.setup || funnel.error ? (
            <Problem read={funnel} what="The funnel" detail="admin_funnel" />
          ) : steps.length && (steps[0]?.count ?? 0) > 0 ? (
            <ul className="wp7-bars">
              {steps.map((st) => (
                <li key={st.label}>
                  <div className="wp7-bar-top">
                    <span>{st.label}</span>
                    <span className="v2-muted">
                      {n(st.count)}
                      {st.ofJoined === null ? '' : ` · ${pct(st.ofJoined)}`}
                      {st.ofPrevious === null ? '' : ` · ${pct(st.ofPrevious)} of step before`}
                    </span>
                  </div>
                  <div className="wp7-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(Math.min(1, st.ofJoined ?? 0) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <v2.Empty title="Nobody joined in this period" />
          )}
        </v2.Card>
        <v2.Card title="What the promotions earned" sub="Promoted jobs: money spent by posters, and how often they were seen and tapped.">
          {promo.setup || promo.error ? (
            <Problem read={promo} what="Promotion results" detail="admin_promotion_roi" />
          ) : promo.data ? (
            <>
              <v2.KV
                rows={[
                  ['Promotions started', `${n(promo.data.promotions)} · ${n(promo.data.active)} running now`],
                  ['Spent on views', inr(promo.data.spendMinor)],
                  ['Views', n(promo.data.impressions)],
                  ['Taps', `${n(promo.data.clicks)} · ${promo.data.impressions ? pct(promo.data.clicks / promo.data.impressions) : '—'} of views`],
                ]}
              />
              <a className="v2-btn ghost wp7-mt" href="/promotions">
                Promotions →
              </a>
            </>
          ) : (
            <v2.Empty title="No promotion activity" />
          )}
        </v2.Card>
      </v2.Grid>

      <div className="wp7-mt">
        <v2.Card title="Do people stay active?" sub="Share of each sign-up week who posted a job or sent an offer in the weeks after joining.">
          {retention.setup || retention.error ? (
            <Problem read={retention} what="Retention" detail="admin_retention" />
          ) : grid.length ? (
            <div className="wp7-ret">
              <table className="wp7-rtbl">
                <caption className="sr-only">Retention by sign-up week</caption>
                <thead>
                  <tr>
                    <th scope="col">Joined in week of</th>
                    <th scope="col" className="r">
                      People
                    </th>
                    {Array.from({ length: 9 }, (_, i) => (
                      <th key={i} scope="col" className="r">
                        {i === 0 ? 'Same week' : `+${i}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((r) => (
                    <tr key={r.week}>
                      <td className="nowrap">
                        <b>{istDate(r.week)}</b>
                      </td>
                      <td className="r">{n(r.size)}</td>
                      {r.cells.map((c, i) => (
                        <td key={i} className="r">
                          {c === null ? (
                            <span className="v2-muted">—</span>
                          ) : (
                            <span className="wp7-cell" style={{ background: `color-mix(in srgb, var(--jade) ${retentionTint(c)}%, transparent)` }}>
                              {pct(c)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <v2.Empty title="Not enough sign-ups yet" />
          )}
        </v2.Card>
      </div>
    </div>
  );
}
