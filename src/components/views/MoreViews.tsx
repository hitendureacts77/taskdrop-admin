import Link from 'next/link';
import type { PlatformStats, PromotionRow, SettingRow, TaskRow, UserRow } from '@/lib/data';
import { inr, istDate, istDateTime, pct } from '@/lib/format';
import { PROMOTION_STATUS, taskStatus } from '@/lib/labels';
import { ConfirmAction, type FormAction } from '../ConfirmAction';
import { Card, Empty, JobLink, Money, Notice, PageHeader, PersonLink, Pill, SearchBox, StatLink, Tabs } from '../ui';

// -------------------------------------------------------------- promotions --

export function PromotionsView({ rows }: { rows: PromotionRow[] }) {
  const active = rows.filter((r) => r.status === 'active');
  const paid = rows.filter((r) => r.status === 'active' || r.status === 'expired');
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Promotions' }]}
        title="Promotions"
        sub="Posters paying to show their job higher. What they pay is TaskDrop’s own earnings (the “Promotions” line)."
      />
      <div className="figures figures-cards">
        <div className="figure card">
          <span className="figure-label">Showing now</span>
          <span className="figure-num plain">{active.length}</span>
          <span className="muted small">promoted jobs</span>
        </div>
        <div className="figure card">
          <span className="figure-label">Paid for (latest {rows.length})</span>
          <Money minor={paid.reduce((a, r) => a + r.amountMinor, 0)} className="figure-num" />
          <Link href="/money/entries?when=all&kind=ad_revenue" className="figure-link">
            Promotion earnings →
          </Link>
        </div>
      </div>
      <Card title="Latest promotions" flush>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Job</th>
                  <th className="th">Paid by</th>
                  <th className="th num">Amount</th>
                  <th className="th">For</th>
                  <th className="th">Status</th>
                  <th className="th">Runs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = PROMOTION_STATUS[r.status] ?? { label: r.status, tone: 'grey' as const };
                  return (
                    <tr key={r.id}>
                      <td className="td">
                        <JobLink id={r.taskId} title={r.title} />
                      </td>
                      <td className="td">
                        <PersonLink id={r.userId} name={r.user} />
                      </td>
                      <td className="td num">
                        <Money minor={r.amountMinor} />
                      </td>
                      <td className="td">
                        {r.days} day{r.days === 1 ? '' : 's'}
                      </td>
                      <td className="td">
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </td>
                      <td className="td nowrap small">{r.startsAt ? `${istDate(r.startsAt)} – ${r.endsAt ? istDate(r.endsAt) : '…'}` : 'Not started'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No promotions yet">When a poster boosts a job, it shows up here.</Empty>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- settings --

type Info = { label: string; help: string; kind: 'percent' | 'days' | 'seconds' | 'count' | 'bool' | 'raw'; editable: boolean; consequence?: string };

const SETTINGS: Record<string, Info> = {
  worker_commission_pct: {
    label: 'Commission TaskDrop keeps',
    help:
      'Share of the job price TaskDrop keeps when a poster approves. Read-only here: the database re-reads it when approved earnings finish clearing, so changing it would move money on jobs already approved. Change it in a migration when nothing is clearing.',
    kind: 'percent',
    editable: false,
  },
  poster_service_fee_pct: {
    label: 'Service fee posters pay',
    help: 'Added on top of the job price when a poster pays.',
    kind: 'percent',
    editable: true,
    consequence: 'Applies to payments made from now on. Jobs already paid for keep the fee they paid.',
  },
  post_start_cancel_penalty_pct: {
    label: 'Paid to the worker if a started job is cancelled',
    help: 'Share of the price the worker keeps when a poster cancels after work began.',
    kind: 'percent',
    editable: true,
    consequence: 'Applies to cancellations from now on.',
  },
  review_window_days: {
    label: 'Days a poster has to approve',
    help: 'After the worker marks a job done, the money releases on its own after this many days.',
    kind: 'days',
    editable: true,
    consequence: 'Applies to jobs marked done from now on.',
  },
  clearing_period_days: {
    label: 'Days before a worker can withdraw',
    help: 'How long approved earnings stay “clearing” before they can be withdrawn.',
    kind: 'days',
    editable: true,
    consequence: 'Applies to jobs approved from now on.',
  },
  max_video_seconds: { label: 'Longest video on a job post', help: 'In seconds.', kind: 'seconds', editable: true },
  dev_otp_for_all: {
    label: 'Developer sign-in switch (dev_otp_for_all)',
    help: 'A testing switch for sign-in codes that affects every account. Read-only here on purpose. Check what it does in your app code; switches like this are normally Off once real people use the app.',
    kind: 'bool',
    editable: false,
  },
};

function show(kind: Info['kind'], v: unknown): string {
  if (kind === 'percent') return pct(Number(v));
  if (kind === 'days') return `${Number(v)} day${Number(v) === 1 ? '' : 's'}`;
  if (kind === 'seconds') return `${Number(v)} seconds`;
  if (kind === 'bool') return v === true || v === 'true' ? 'On' : 'Off';
  if (kind === 'count') return String(Number(v));
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function inputValue(kind: Info['kind'], v: unknown): string {
  if (kind === 'percent') return String(Number((Number(v) * 100).toFixed(2)));
  if (kind === 'bool') return v === true || v === 'true' ? 'On' : 'Off';
  return String(Number(v));
}

export function SettingsView({ rows, update }: { rows: SettingRow[]; update: FormAction }) {
  // Shown in the order SETTINGS lists them, which is the order of the design.
  const order = Object.keys(SETTINGS);
  const known = rows.filter((r) => SETTINGS[r.key]).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  const other = rows.filter((r) => !SETTINGS[r.key]);
  return (
    <>
      <PageHeader crumbs={[{ label: 'Settings' }]} title="Settings" sub="The numbers the whole app runs on. Every change asks you to confirm, and says what it affects." />
      <Notice tone="gold" icon="alert" title="These change the app for everyone, straight away.">
        The database reads them every time money moves, so a change here is live the moment you confirm it.
      </Notice>
      <Card title="Money and timing" flush>
        <ul className="settings">
          {known.map((r) => {
            const info = SETTINGS[r.key]!;
            const unit = info.kind === 'percent' ? ' (in %)' : info.kind === 'days' ? ' (days)' : info.kind === 'bool' ? ' (On or Off)' : '';
            return (
              <li key={r.key} className="setting">
                <div className="setting-text">
                  <strong>{info.label}</strong>
                  <span className="muted small">{info.help}</span>
                  <span className="muted small">Last changed {istDateTime(r.updated_at)}</span>
                </div>
                <div className="setting-value">{show(info.kind, r.value)}</div>
                {info.editable ? (
                  <ConfirmAction
                    action={update}
                    hidden={{ key: r.key }}
                    trigger="Change"
                    tone="quiet"
                    title={`Change “${info.label}”?`}
                    consequence={
                      <>
                        Now: <strong>{show(info.kind, r.value)}</strong>. {info.consequence ?? 'Applies from now on.'}
                      </>
                    }
                    field={{ name: 'value', label: `New value${unit}`, defaultValue: inputValue(info.kind, r.value), required: true, inputMode: info.kind === 'bool' ? 'text' : 'decimal' }}
                    confirmLabel="Save the new value"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
      {other.length ? (
        <Card title="Advanced (ads pricing and others)" sub="Read-only here. Change these in a database migration so the reason is written down." flush>
          <ul className="settings">
            {other.map((r) => (
              <li key={r.key} className="setting">
                <div className="setting-text">
                  <code>{r.key}</code>
                </div>
                <div className="setting-value">{typeof r.value === 'string' ? r.value : JSON.stringify(r.value)}</div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

// ----------------------------------------------------------------- reports --

export function ReportsView({ s, days, earnedMinor }: { s: PlatformStats; days: number; earnedMinor: number }) {
  const tabs = [7, 30, 90, 365].map((n) => ({ href: `/reports?days=${n}`, label: n === 365 ? '1 year' : `${n} days`, active: n === days }));
  return (
    <>
      <PageHeader crumbs={[{ label: 'Reports' }]} title="Reports" sub={`How TaskDrop did over the last ${days === 365 ? 'year' : `${days} days`}. Every number opens the list behind it.`} />
      <Tabs label="Period" items={tabs} />
      <Card title="Money">
        <div className="figures">
          <div className="figure">
            <span className="figure-label">Value of jobs finished</span>
            <Money minor={s.gmvMinor} className="figure-num" />
            <span className="muted small">Agreed prices of jobs approved in this period</span>
          </div>
          <div className="figure">
            <span className="figure-label">TaskDrop earned</span>
            <Money minor={earnedMinor} className="figure-num" />
            <Link href="/money" className="figure-link">
              Earnings →
            </Link>
          </div>
        </div>
      </Card>
      <div className="stats">
        <StatLink href="/tasks" icon="jobs" label="Jobs posted" value={s.tasksPosted.toLocaleString('en-IN')} />
        <StatLink href="/tasks?filter=finished" icon="check" label="Jobs finished" value={s.tasksCompleted.toLocaleString('en-IN')} />
        <StatLink href="/tasks?filter=cancelled" icon="undo" label="Jobs cancelled" value={s.tasksCancelled.toLocaleString('en-IN')} />
        <StatLink href="/tasks?filter=open" icon="clock" label="Getting quotes now" value={s.tasksOpen.toLocaleString('en-IN')} />
        <StatLink href="/tasks?filter=disputed" icon="scale" label="Open disputes" value={s.disputesOpen.toLocaleString('en-IN')} />
      </div>
      <div className="stats">
        <StatLink href="/tasks" icon="send" label="Quotes sent" value={s.quotesPlaced.toLocaleString('en-IN')} sub={`${pct(s.quotedRate > 1 ? s.quotedRate / 100 : s.quotedRate)} of jobs got a quote`} />
        <StatLink href="/users?filter=new_today" icon="people" label="New people" value={s.newUsers.toLocaleString('en-IN')} />
        <StatLink href="/users" icon="people" label="People in total" value={s.totalUsers.toLocaleString('en-IN')} sub={`${s.activeUsers.toLocaleString('en-IN')} active in this period`} />
        <StatLink href="/users?filter=workers" icon="star" label="Average worker rating" value={s.avgWorkerRating ? `★ ${s.avgWorkerRating.toFixed(1)}` : '—'} />
      </div>
    </>
  );
}

// ------------------------------------------------------------------ search --

export function SearchView({ q, tasks, people }: { q: string; tasks: TaskRow[]; people: UserRow[] }) {
  return (
    <>
      <PageHeader crumbs={[{ label: 'Search' }]} title="Search" right={<SearchBox action="/search" defaultValue={q} placeholder="Search jobs and people" />} />
      {!q ? (
        <Empty title="Type a job title or a person’s name" />
      ) : (
        <div className="grid-2">
          <Card title={`Jobs (${tasks.length})`} right={<Link href={`/tasks?q=${encodeURIComponent(q)}`}>All →</Link>}>
            {tasks.length ? (
              <ul className="plain-list">
                {tasks.map((t) => {
                  const st = taskStatus(t.status);
                  return (
                    <li key={t.id}>
                      <JobLink id={t.id} title={t.title} />
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">No jobs match.</p>
            )}
          </Card>
          <Card title={`People (${people.length})`} right={<Link href={`/users?q=${encodeURIComponent(q)}`}>All →</Link>}>
            {people.length ? (
              <ul className="plain-list">
                {people.map((u) => (
                  <li key={u.id}>
                    <PersonLink id={u.id} name={u.name} />
                    <span className="muted small">{u.walletMinor ? inr(u.walletMinor) : ''}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nobody matches.</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
