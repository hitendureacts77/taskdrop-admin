import Link from 'next/link';
import type { TaskFilter, TaskRow } from '@/lib/data';
import { TASK_FILTERS } from '@/lib/data';
import { istDate, timeAgo } from '@/lib/format';
import { taskStatus } from '@/lib/labels';
import { Card, Empty, JobLink, Money, PageHeader, Pager, PersonLink, Pill, SearchBox, Tabs } from '../ui';

export type TasksData = {
  now: string;
  filter: TaskFilter;
  q: string;
  page: number;
  pageSize: number;
  rows: TaskRow[];
  total: number;
  heldTotal: number | null;
};

const INTRO: Partial<Record<TaskFilter, string>> = {
  escrow: 'Jobs the poster has paid for and that aren’t finished. TaskDrop is holding their money.',
  open: 'Posted and getting quotes. No worker hired and no money held yet.',
  active: 'A worker is hired. The job is under way or about to start.',
  waiting: 'The worker says it’s done. The poster has to approve before the money is released.',
  disputed: 'Poster and worker disagree. The money is frozen until you decide.',
  finished: 'Approved and paid out to the worker’s wallet.',
  finished_today: 'Approved today (Indian time).',
  posted_today: 'Posted today (Indian time).',
  cancelled: 'Called off. Any money held went back to the poster.',
};

export function TasksView({ d }: { d: TasksData }) {
  const now = new Date(d.now);
  const href = (over: { filter?: string; page?: number; q?: string }) => {
    const p = new URLSearchParams();
    const filter = over.filter ?? d.filter;
    const q = over.q ?? d.q;
    if (filter !== 'all') p.set('filter', filter);
    if (q) p.set('q', q);
    if (over.page) p.set('page', String(over.page));
    const s = p.toString();
    return `/tasks${s ? `?${s}` : ''}`;
  };
  const label = TASK_FILTERS.find((f) => f.key === d.filter)?.label ?? 'All jobs';

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Jobs' }]}
        title="Jobs"
        sub="Every job on TaskDrop. Click a job to see its money, people and timeline."
        right={<SearchBox action="/tasks" defaultValue={d.q} placeholder="Search jobs by title" hidden={d.filter !== 'all' ? { filter: d.filter } : undefined} />}
      />
      <Tabs label="Show" items={TASK_FILTERS.map((f) => ({ href: href({ filter: f.key, page: 0 }), label: f.label, active: f.key === d.filter }))} />

      <Card
        title={
          <>
            {label}
            {d.q ? <> matching “{d.q}”</> : null}
          </>
        }
        sub={
          <>
            {d.total.toLocaleString('en-IN')} job{d.total === 1 ? '' : 's'}
            {d.heldTotal !== null ? (
              <>
                {' '}
                · <Money minor={d.heldTotal} /> held in escrow for them
              </>
            ) : null}
            {INTRO[d.filter] ? <> · {INTRO[d.filter]}</> : null}
          </>
        }
        flush
      >
        {d.rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Job</th>
                  <th className="th">Poster</th>
                  <th className="th">Worker</th>
                  <th className="th">Status</th>
                  <th className="th num">Price</th>
                  <th className="th num">Held now</th>
                  <th className="th">Last change</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((t) => {
                  const st = taskStatus(t.status);
                  return (
                    <tr key={t.id}>
                      <td className="td">
                        <JobLink id={t.id} title={t.title} />
                        <span className="muted small block">{[t.category, t.place].filter(Boolean).join(' · ') || `Posted ${istDate(t.createdAt)}`}</span>
                      </td>
                      <td className="td">
                        <PersonLink id={t.posterId} name={t.poster} />
                      </td>
                      <td className="td">{t.workerId ? <PersonLink id={t.workerId} name={t.worker} /> : <span className="muted">Not hired</span>}</td>
                      <td className="td">
                        <Pill tone={st.tone} title={st.hint}>
                          {st.label}
                        </Pill>
                      </td>
                      <td className="td num">
                        {t.priceMinor !== null ? <Money minor={t.priceMinor} /> : '—'}
                        <span className="muted small block">{t.priceIsAgreed ? 'agreed' : 'budget'}</span>
                      </td>
                      <td className="td num">{t.heldMinor !== null ? <Money minor={t.heldMinor} /> : <span className="muted">—</span>}</td>
                      <td className="td nowrap muted">{timeAgo(t.updatedAt, now)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={d.q ? 'No jobs match that search' : 'No jobs here'}>
            {d.q ? (
              <>
                Try fewer words, or <Link href={href({ q: '', page: 0 })}>clear the search</Link>.
              </>
            ) : (
              'Nothing in this list right now.'
            )}
          </Empty>
        )}
        <Pager page={d.page} pageSize={d.pageSize} total={d.total} hrefFor={(page) => href({ page })} />
      </Card>
    </>
  );
}
