import Link from 'next/link';
import { LineChart } from '../LineChart';
import type { PromoRoi, Read, ReconcileRow } from '@/lib/growth';
import { RECONCILE_CHECKS, checkTitle, funnelSteps, retentionGrid, totalDaily, type DailyRow, type FunnelRow, type RetentionRow } from '@/lib/growth-calc';
import { CHART_COLORS } from '@/lib/labels';
import { inr, istDate, pct } from '@/lib/format';
import { Card, Delta, Empty, Money, PageHeader, Pill, Tabs } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

const shortDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Business analytics shown under the existing platform figures on the Reports page. */
export function GrowthReports({
  days,
  daily,
  previous,
  funnel,
  retention,
  promo,
}: {
  days: number;
  daily: Read<DailyRow[]>;
  previous: Read<DailyRow[]>;
  funnel: Read<FunnelRow | null>;
  retention: Read<RetentionRow[]>;
  promo: Read<PromoRoi | null>;
}) {
  if (daily.setup) {
    return (
      <div className="stack">
        <SetupNotice what="Business analytics" migration="096_business_analytics (and 094 for the funnel)" />
      </div>
    );
  }
  if (daily.error) return <ReadError message={daily.error} />;

  const t = totalDaily(daily.data);
  const p = totalDaily(previous.data);
  const labels = daily.data.map((d) => new Date(`${d.day}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }));
  const tickEvery = Math.max(1, Math.ceil(daily.data.length / 6));
  const ticks = daily.data.flatMap((d, i) => (i % tickEvery === 0 ? [{ index: i, text: shortDay(d.day) }] : []));
  const grid = retentionGrid(retention.data);
  const steps = funnel.data ? funnelSteps(funnel.data) : [];
  const exportHref = `/api/reports/export?days=${days}`;

  return (
    <div className="stack">
      <Card
        title="How the business is doing"
        sub={`The last ${days} days, against the ${days} days before. “Paid in for jobs” is money customers paid to fund jobs.`}
        right={
          <a className="btn" href={exportHref}>
            Download as spreadsheet
          </a>
        }
      >
        <div className="figures">
          <div className="figure">
            <span className="figure-label">Paid in for jobs</span>
            <Money minor={t.fundedMinor} className="figure-num" />
            <Delta current={t.fundedMinor} previous={p.fundedMinor} versus="the days before" />
          </div>
          <div className="figure">
            <span className="figure-label">TaskDrop earned</span>
            <Money minor={t.revenueMinor} className="figure-num" />
            <Delta current={t.revenueMinor} previous={p.revenueMinor} versus="the days before" />
          </div>
          <div className="figure">
            <span className="figure-label">Take rate</span>
            <span className="figure-num">{t.takeRate === null ? '—' : pct(t.takeRate)}</span>
            <span className="muted small">Earned ÷ paid in</span>
          </div>
          <div className="figure">
            <span className="figure-label">Jobs finished</span>
            <span className="figure-num">{t.jobsFinished.toLocaleString('en-IN')}</span>
            <Delta current={t.jobsFinished} previous={p.jobsFinished} versus="the days before" />
          </div>
          <div className="figure">
            <span className="figure-label">New people</span>
            <span className="figure-num">{t.newPeople.toLocaleString('en-IN')}</span>
            <Delta current={t.newPeople} previous={p.newPeople} versus="the days before" />
          </div>
          <div className="figure">
            <span className="figure-label">Jobs posted</span>
            <span className="figure-num">{t.jobsPosted.toLocaleString('en-IN')}</span>
            <Delta current={t.jobsPosted} previous={p.jobsPosted} versus="the days before" />
          </div>
        </div>
        <LineChart
          labels={labels}
          ticks={ticks}
          height={240}
          summary={`Money paid in for jobs and TaskDrop’s earnings each day for the last ${days} days.`}
          series={[
            { name: 'Paid in for jobs', color: CHART_COLORS.escrow, values: daily.data.map((d) => d.fundedMinor), area: true },
            { name: 'TaskDrop earned', color: CHART_COLORS.total, values: daily.data.map((d) => d.revenueMinor) },
          ]}
          emptyText="No money has come in for this period."
        />
      </Card>

      <Card title="Health of the marketplace" sub="Rates are shown as — when there is nothing to divide by.">
        <div className="figures">
          <div className="figure">
            <span className="figure-label">Jobs finished ÷ posted</span>
            <span className="figure-num">{t.finishRate === null ? '—' : pct(t.finishRate)}</span>
            <span className="muted small">Before: {p.finishRate === null ? '—' : pct(p.finishRate)}</span>
          </div>
          <div className="figure">
            <span className="figure-label">Cancelled ÷ posted</span>
            <span className="figure-num">{t.cancelRate === null ? '—' : pct(t.cancelRate)}</span>
            <span className="muted small">{t.cancellations} cancelled. Before: {p.cancelRate === null ? '—' : pct(p.cancelRate)}</span>
          </div>
          <div className="figure">
            <span className="figure-label">Disputes decided</span>
            <span className="figure-num">{t.disputesDecided}</span>
            <span className="muted small">{t.disputeRate === null ? '—' : pct(t.disputeRate)} of jobs that ended</span>
          </div>
          <div className="figure">
            <span className="figure-label">Wallet top-ups</span>
            <Money minor={t.topupMinor} className="figure-num" />
            <Delta current={t.topupMinor} previous={p.topupMinor} versus="the days before" />
          </div>
        </div>
      </Card>

      <Card title="From joining to coming back" sub={`People who joined in the last ${days} days, and how far they got.`}>
        {funnel.setup ? (
          <SetupNotice what="The funnel" migration="094_crm_tasks_pipeline" />
        ) : steps.length && (steps[0]?.count ?? 0) > 0 ? (
          <ul className="plain-list">
            {steps.map((s) => (
              <li key={s.label}>
                <span>
                  <strong>{s.label}</strong>
                  <span className="muted small block">
                    {s.ofJoined === null ? '' : `${pct(s.ofJoined)} of everyone who joined`}
                    {s.ofPrevious === null ? '' : ` · ${pct(s.ofPrevious)} of the step before`}
                  </span>
                </span>
                <span>{s.count.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nobody joined in this period" />
        )}
      </Card>

      <Card title="Do people stay active?" sub="Each row is a sign-up week. A cell is the share of that week’s sign-ups who posted a job or sent an offer, that many weeks after joining." flush>
        {retention.setup ? (
          <SetupNotice what="Retention" migration="096_business_analytics" />
        ) : grid.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Joined in week of</th>
                  <th className="th num">People</th>
                  {Array.from({ length: 9 }, (_, i) => (
                    <th key={i} className="th num">
                      {i === 0 ? 'Same week' : `+${i}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((r) => (
                  <tr key={r.week}>
                    <td className="td nowrap">{istDate(r.week)}</td>
                    <td className="td num">{r.size}</td>
                    {r.cells.map((c, i) => (
                      <td key={i} className="td num">
                        {c === null ? <span className="muted">—</span> : pct(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Not enough sign-ups yet" />
        )}
      </Card>

      <Card title="What the promotions earned" sub="Promoted jobs: money spent by posters, and how often they were seen and tapped.">
        {promo.setup ? (
          <SetupNotice what="Promotion results" migration="096_business_analytics" />
        ) : promo.data ? (
          <div className="figures">
            <div className="figure">
              <span className="figure-label">Promotions started</span>
              <span className="figure-num">{promo.data.promotions}</span>
              <span className="muted small">{promo.data.active} running now</span>
            </div>
            <div className="figure">
              <span className="figure-label">Spent on views</span>
              <Money minor={promo.data.spendMinor} className="figure-num" />
            </div>
            <div className="figure">
              <span className="figure-label">Views</span>
              <span className="figure-num">{promo.data.impressions.toLocaleString('en-IN')}</span>
            </div>
            <div className="figure">
              <span className="figure-label">Taps</span>
              <span className="figure-num">{promo.data.clicks.toLocaleString('en-IN')}</span>
              <span className="muted small">{promo.data.impressions ? pct(promo.data.clicks / promo.data.impressions) : '—'} of views</span>
            </div>
          </div>
        ) : (
          <Empty title="No promotion activity" />
        )}
      </Card>
    </div>
  );
}

export function ReconcileView({ days, rows, from, to }: { days: number; rows: Read<ReconcileRow[]>; from: string; to: string }) {
  const counts = new Map<string, number>();
  for (const r of rows.data) counts.set(r.code, (counts.get(r.code) ?? 0) + 1);
  const href = (r: ReconcileRow) => (r.refType === 'task' ? `/tasks/${r.refId}` : r.refType === 'payout' ? `/payouts/${r.refId}` : null);
  return (
    <>
      <PageHeader
        crumbs={[{ href: '/money', label: 'Money' }, { label: 'Money check' }]}
        title="Money check"
        sub={`Things in ${istDate(from)} to ${istDate(to)} that don’t add up inside TaskDrop’s own records. This does not yet compare against Razorpay’s own statements.`}
      />
      <Tabs label="Range" items={[7, 30, 90].map((d) => ({ href: `/money/reconcile?days=${d}`, label: `Last ${d} days`, active: d === days }))} />
      {rows.setup ? (
        <SetupNotice what="The money check" migration="096_business_analytics" />
      ) : rows.error ? (
        <ReadError message={rows.error} />
      ) : (
        <>
          <Card title="Summary">
            <ul className="plain-list">
              {Object.entries(RECONCILE_CHECKS).map(([code, c]) => (
                <li key={code}>
                  <span>
                    <strong>{c.title}</strong>
                    <span className="muted small block">{c.why}</span>
                  </span>
                  {counts.get(code) ? <Pill tone="red">{counts.get(code)}</Pill> : <Pill tone="green">OK</Pill>}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="What to look at" flush>
            {rows.data.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="th">Problem</th>
                      <th className="th">When</th>
                      <th className="th num">Amount</th>
                      <th className="th">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.data.map((r) => {
                      const h = href(r);
                      return (
                        <tr key={`${r.code}-${r.refId}`}>
                          <td className="td">
                            <Pill tone={r.severity === 'high' ? 'red' : 'gold'}>{r.severity === 'high' ? 'Important' : 'Check'}</Pill> {h ? <Link href={h}>{checkTitle(r.code)}</Link> : checkTitle(r.code)}
                          </td>
                          <td className="td nowrap">{r.at ? istDate(r.at) : '—'}</td>
                          <td className="td num">{r.amountMinor === null ? '—' : inr(r.amountMinor)}</td>
                          <td className="td">{r.detail}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Everything adds up" icon="check" />
            )}
          </Card>
        </>
      )}
    </>
  );
}
