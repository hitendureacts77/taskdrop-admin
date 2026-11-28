import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import type { DisputeRow } from '@/lib/data';
import { inr, timeAgo } from '@/lib/format';
import { isTestRow } from '@/lib/test-data';

/**
 * v2 Disputes (design #/disputes, F155–F157). Oldest first; the frozen amount is the Plan B hold
 * when there is one (heldByTask), else what an older wallet job's assignment holds.
 */
export function DisputesV2({
  rows,
  total,
  now,
  heldByTask,
  hideTest,
  canDecide,
}: {
  rows: DisputeRow[];
  total: number | null;
  now: string;
  heldByTask: Map<string, number>;
  hideTest: boolean;
  canDecide: boolean;
}) {
  const nowDate = new Date(now);
  const list = rows.filter((r) => !hideTest || !isTestRow({ posterId: r.posterId, userId: r.workerId, title: r.title }));
  const frozenOf = (r: DisputeRow) => heldByTask.get(r.taskId) ?? (r.funded ? r.escrowMinor : 0);
  const frozen = list.reduce((s, r) => s + frozenOf(r), 0);
  const shown = Math.min(60, list.length);
  // When test rows are hidden, the total is the visible count (same filter as the list).
  const count = hideTest ? list.length : (total ?? list.length);

  return (
    <>
      <v2.PageHeader title={`${count} open disputes`} sub="Someone reported a problem with the work. Decide who gets the money." crumbs={[{ label: 'Disputes' }]} />
      <v2.Note tone="plain" title="How deciding works">
        <b>Pay the worker</b> when the work stands: their share is released after the commission. <b>Refund the poster</b> when it was not done: everything they paid,
        service fee included, goes back and the job is cancelled. <b>Split</b> <v2.NewTag /> when part was done: you pick what the work is worth, the worker is paid for
        that part and the rest goes back. Split works for jobs paid with pay per task.
      </v2.Note>
      <v2.Card title={`${count} open disputes`} sub={`${inr(frozen)} frozen. Oldest first. Showing ${shown} of ${count}.`}>
        <v2.DataTable
          columns={[{ label: 'Job' }, { label: 'Poster' }, { label: 'Worker' }, { label: 'Reason given' }, { label: 'Frozen', right: true }, { label: 'Waiting' }, { label: '' }]}
          empty="No disputes here"
          rows={list.slice(0, 60).map((r) => {
            const waitH = (nowDate.getTime() - new Date(r.since).getTime()) / 3_600_000;
            const amount = frozenOf(r);
            return {
              key: r.taskId,
              href: `/tasks/${r.taskId}`,
              test: !hideTest && isTestRow({ posterId: r.posterId, userId: r.workerId, title: r.title }),
              late: waitH > 48,
              cells: [
                <b key="t">{r.title}</b>,
                r.poster,
                r.worker ?? <span className="muted">Not hired</span>,
                r.reason ? (
                  <span key="r" className="wp2-reason">
                    “{r.reason}”{r.reasonBy ? <span className="muted block">{r.reasonBy}</span> : null}
                  </span>
                ) : (
                  <span className="muted small">No reason recorded</span>
                ),
                amount > 0 ? <span className="wp2-gold">{inr(amount)}</span> : <span className="muted">Never paid</span>,
                timeAgo(r.since, nowDate),
                <Link key="d" className={`v2-btn sm${canDecide ? ' pri' : ''}`} href={`/tasks/${r.taskId}`}>
                  {canDecide ? 'Decide' : 'Open'}
                </Link>,
              ],
            };
          })}
        />
      </v2.Card>
    </>
  );
}
