import * as v2 from '@/components/v2/ui';
import type { TaskFilter, TaskRow } from '@/lib/data';
import { TASK_FILTERS } from '@/lib/data';
import { inr, istDate, timeAgo } from '@/lib/format';
import { taskStatus, type Tone as OldTone } from '@/lib/labels';
import { isTestRow } from '@/lib/test-data';

const PILL: Record<OldTone, v2.Tone> = { green: 'ok', gold: 'wait', blue: 'earn', red: 'bad', grey: 'mut' };

const INTRO: Partial<Record<TaskFilter, string>> = {
  escrow: 'Jobs the poster has paid for that aren’t finished. The money is held until the work is approved.',
  open: 'Posted and getting quotes. No worker hired and no money held yet.',
  active: 'A worker is hired. The job is under way or about to start.',
  overdue: 'Past the time the worker promised.',
  waiting: 'The worker says it’s done. The poster has to approve before the money is released.',
  disputed: 'Poster and worker disagree. The money is frozen until you decide.',
  finished: 'Approved and paid out to the worker.',
  finished_today: 'Approved today (Indian time).',
  posted_today: 'Posted today (Indian time).',
  cancelled: 'Called off. Any money held went back to the poster.',
};

/** v2 Jobs list (design #/tasks, F196–F201). Same data and paging as today's list. */
export function TasksV2({
  now,
  filter,
  q,
  page,
  pageSize,
  rows,
  total,
  heldTotal,
  heldByTask,
  hideMoney,
  hideTest,
}: {
  now: string;
  filter: TaskFilter;
  q: string;
  page: number;
  pageSize: number;
  rows: TaskRow[];
  total: number;
  heldTotal: number | null;
  heldByTask: Map<string, number>;
  hideMoney: boolean;
  hideTest: boolean;
}) {
  const nowDate = new Date(now);
  const href = (over: { filter?: string; page?: number }) => {
    const p = new URLSearchParams();
    const f = over.filter ?? filter;
    if (f !== 'all') p.set('filter', f);
    if (q) p.set('q', q);
    if (over.page) p.set('page', String(over.page));
    return `/tasks${p.size ? `?${p}` : ''}`;
  };
  const label = TASK_FILTERS.find((f) => f.key === filter)?.label ?? 'All jobs';
  const held = (r: TaskRow) => heldByTask.get(r.id) ?? r.heldMinor;

  const columns: v2.Column[] = [
    { label: 'Job' },
    { label: 'Poster' },
    { label: 'Worker' },
    { label: 'Status' },
    { label: 'Price', right: true },
    ...(hideMoney ? [] : [{ label: 'Held now', right: true }]),
    { label: 'Last change' },
  ];

  return (
    <>
      <v2.PageHeader title="Jobs" sub="Every job posted on TaskDrop, newest change first." crumbs={[{ label: 'Jobs' }]} />
      <v2.Tabs label="Job filters" items={TASK_FILTERS.map((f) => ({ href: href({ filter: f.key, page: 0 }), label: f.label, active: f.key === filter }))} />
      <v2.TableSearch action="/tasks" value={q} placeholder="Search job titles" keep={{ filter: filter === 'all' ? undefined : filter }} />
      <v2.Card
        title={`${total.toLocaleString('en-IN')} ${total === 1 ? 'job' : 'jobs'}${filter === 'all' ? '' : ` · ${label}`}${q ? ` matching “${q}”` : ''}`}
        sub={
          <>
            {INTRO[filter] ?? null}
            {filter === 'escrow' && heldTotal !== null && !hideMoney ? <> {inr(heldTotal)} held for them.</> : null}
          </>
        }
      >
        <v2.DataTable
          columns={columns}
          empty={q ? 'No job matches that search. Clear the search to see them all.' : 'Nothing in this list'}
          rows={rows.map((r) => {
            const st = taskStatus(r.status);
            const h = held(r);
            return {
              key: r.id,
              href: `/tasks/${r.id}`,
              test: !hideTest && isTestRow({ posterId: r.posterId, userId: r.workerId, title: r.title }),
              cells: [
                <span key="t">
                  <b>{r.title}</b>
                  <span className="muted small block">{[r.category, r.place].filter(Boolean).join(' · ') || `Posted ${istDate(r.createdAt)}`}</span>
                </span>,
                r.poster,
                r.worker ?? <span className="muted">Not hired</span>,
                <span key="s" title={st.hint}>
                  <v2.Pill tone={PILL[st.tone]}>{st.label}</v2.Pill>
                </span>,
                r.priceMinor !== null ? (
                  <span key="p">
                    {inr(r.priceMinor)}
                    <span className="muted small block">{r.priceIsAgreed ? 'agreed' : 'budget'}</span>
                  </span>
                ) : (
                  '—'
                ),
                ...(hideMoney ? [] : [h ? <span key="h" className="wp2-gold">{inr(h)}</span> : <span className="muted">—</span>]),
                timeAgo(r.updatedAt, nowDate),
              ],
            };
          })}
        />
        <v2.Pager page={page} pageSize={pageSize} total={total} hrefFor={(p) => href({ page: p })} />
      </v2.Card>
    </>
  );
}
