import Link from 'next/link';
import { FinishButton, FollowUpForm } from '../GrowthForms';
import type { FollowUp, Read, StaffPerfRow } from '@/lib/growth';
import { PIPELINE_STAGES, activityTotal, formatMinutes } from '@/lib/growth-calc';
import { istDate, pct } from '@/lib/format';
import { roleLabel, asStaffRole } from '@/lib/staff-roles';
import { Card, Empty, PageHeader, Pill, Tabs } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

type FollowUpView = 'mine' | 'all' | 'done';

export function FollowUpsView({
  view,
  items,
  pipeline,
  staff,
  me,
  now: nowIso,
}: {
  view: FollowUpView;
  items: Read<FollowUp[]>;
  pipeline: Read<Record<string, { people: number; atRisk: number }>>;
  staff: { id: string; name: string }[];
  me: string;
  now: string;
}) {
  const now = new Date(nowIso);
  const total = Object.values(pipeline.data).reduce((s, x) => s + x.people, 0);
  return (
    <>
      <PageHeader title="Follow-ups & pipeline" sub="Things staff must do for customers, and where every customer is on the road from signing up to coming back." />

      <Card title="Customer pipeline" sub="Where each person has got to. “At risk” means not seen for 30 days after getting started.">
        {pipeline.setup ? (
          <SetupNotice what="The pipeline" migration="094_crm_tasks_pipeline" />
        ) : pipeline.error ? (
          <ReadError message={pipeline.error} />
        ) : (
          <div className="figures">
            {PIPELINE_STAGES.map((s) => {
              const x = pipeline.data[s.key] ?? { people: 0, atRisk: 0 };
              return (
                <Link key={s.key} href="/crm/segments" className="figure">
                  <span className="figure-label">{s.label}</span>
                  <span className="figure-num">{x.people.toLocaleString('en-IN')}</span>
                  <span className="muted small">
                    {total ? pct(x.people / total) : '—'} of everyone · {s.hint}
                    {x.atRisk ? ` · ${x.atRisk} at risk` : ''}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Tabs
        label="Show"
        items={[
          { href: '/crm/tasks', label: 'Mine', active: view === 'mine' },
          { href: '/crm/tasks?view=all', label: 'Everyone’s open', active: view === 'all' },
          { href: '/crm/tasks?view=done', label: 'Done', active: view === 'done' },
        ]}
      />

      <div className="grid-main-side">
        <Card title={view === 'done' ? 'Finished follow-ups' : 'Open follow-ups'} flush>
          {items.setup ? (
            <SetupNotice what="Follow-ups" migration="094_crm_tasks_pipeline" />
          ) : items.error ? (
            <ReadError message={items.error} />
          ) : items.data.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="th">What</th>
                    <th className="th">About</th>
                    <th className="th">{view === 'done' ? 'Done' : 'Due'}</th>
                    <th className="th">{view === 'done' ? 'By' : 'Owner'}</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {items.data.map((f) => {
                    const overdue = f.status === 'open' && f.dueAt !== null && new Date(f.dueAt) < now;
                    return (
                      <tr key={f.id}>
                        <td className="td">
                          {f.title}
                          {f.detail ? <span className="muted small block">{f.detail}</span> : null}
                          {f.source === 'automation' ? <Pill tone="blue">Automatic</Pill> : null}
                        </td>
                        <td className="td">{f.userId ? <Link href={`/users/${f.userId}`}>{f.person}</Link> : <span className="muted">—</span>}</td>
                        <td className="td nowrap">
                          {view === 'done' ? (f.completedAt ? istDate(f.completedAt) : '—') : f.dueAt ? (overdue ? <Pill tone="red">Overdue {istDate(f.dueAt)}</Pill> : istDate(f.dueAt)) : <span className="muted">No date</span>}
                        </td>
                        <td className="td">{view === 'done' ? f.completedBy ?? '—' : f.owner}</td>
                        <td className="td">
                          <FinishButton taskId={f.id} reopen={view === 'done'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={view === 'done' ? 'Nothing finished yet' : 'Nothing to do'} />
          )}
        </Card>

        <div className="stack">
          {items.setup ? null : (
            <Card title="Add a follow-up" sub="You can also add one from a person’s page.">
              <FollowUpForm staff={staff} me={me} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export function PerformanceView({
  rows,
  days,
  from,
  to,
}: {
  rows: Read<StaffPerfRow[]>;
  days: number;
  from: string;
  to: string;
}) {
  const sorted = [...rows.data].sort((a, b) => activityTotal(b) - activityTotal(a));
  return (
    <>
      <PageHeader title="Team performance" sub={`What each member of staff did from ${istDate(from)} to ${istDate(to)}. This shows workload and speed; it is not a score to judge people by.`} />
      <Tabs
        label="Range"
        items={[7, 30, 90].map((d) => ({ href: `/team/performance?days=${d}`, label: `Last ${d} days`, active: d === days }))}
      />
      {rows.setup ? (
        <SetupNotice what="Team performance" migration="095_staff_performance (and 094, 093 for follow-ups and reports)" />
      ) : rows.error ? (
        <ReadError message={rows.error} />
      ) : sorted.length ? (
        <Card flush>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Person</th>
                  <th className="th num">Follow-ups done</th>
                  <th className="th num">On time</th>
                  <th className="th num">Open / overdue</th>
                  <th className="th num">Notes</th>
                  <th className="th num">Help replies</th>
                  <th className="th num">First reply</th>
                  <th className="th num">Reports</th>
                  <th className="th num">Disputes</th>
                  <th className="th num">Customers owned</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.userId}>
                    <td className="td">
                      <Link href={`/users/${p.userId}`}>{p.name}</Link>
                      <span className="muted small block">{roleLabel(asStaffRole(p.staffRole))}</span>
                    </td>
                    <td className="td num">{p.tasksDone}</td>
                    <td className="td num">{p.tasksDone ? pct(p.tasksOnTime / p.tasksDone) : '—'}</td>
                    <td className="td num">
                      {p.tasksOpen}
                      {p.tasksOverdue ? <span className="muted"> / </span> : null}
                      {p.tasksOverdue ? <Pill tone="red">{p.tasksOverdue}</Pill> : null}
                    </td>
                    <td className="td num">{p.notes}</td>
                    <td className="td num">{p.ticketReplies}</td>
                    <td className="td num">{formatMinutes(p.firstResponseMinutes)}</td>
                    <td className="td num">{p.reportsHandled}</td>
                    <td className="td num">{p.disputesDecided}</td>
                    <td className="td num">{p.customersOwned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Empty title="No staff to show" />
      )}
    </>
  );
}
