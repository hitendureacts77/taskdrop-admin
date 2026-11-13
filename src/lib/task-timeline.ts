/**
 * The job page's timeline steps. Pure, so it is unit-tested.
 * A cancelled job gets a "Cancelled" step; "Approved" stays at "Not yet" for it,
 * because completed_at holds the cancel time there, not an approval.
 */
export type TimelineStep = { label: string; at: string | null; note?: string };

export type TimelineJob = {
  status: string;
  poster: string;
  createdAt: string;
  fundedAt: string | null;
  startedAt: string | null;
  workDoneAt: string | null;
  completedAt: string | null;
  autoCompleteAt: string | null;
  clearAt: string | null;
  clearedAt: string | null;
};

export function buildTimeline(t: TimelineJob, hired: { worker: string; createdAt: string } | null, fmt: (iso: string) => string): TimelineStep[] {
  const cancelled = t.status === 'CANCELLED';
  const finished = t.status === 'COMPLETED' || t.status === 'AUTO_COMPLETED';
  return [
    { label: 'Posted', at: t.createdAt },
    { label: hired ? `${hired.worker} hired` : 'Worker hired', at: hired?.createdAt ?? null },
    { label: `${t.poster} paid into escrow`, at: t.fundedAt },
    { label: 'Work started', at: t.startedAt },
    { label: 'Marked done by the worker', at: t.workDoneAt },
    ...(t.status === 'WORK_DONE' && t.autoCompleteAt ? [{ label: 'Releases on its own if the poster stays silent', at: null, note: fmt(t.autoCompleteAt) }] : []),
    { label: t.status === 'AUTO_COMPLETED' ? 'Approved automatically' : 'Approved, money released', at: finished ? t.completedAt : null },
    ...(cancelled ? [{ label: 'Cancelled', at: t.completedAt, note: t.completedAt ? undefined : 'Time not recorded' }] : []),
    { label: 'Worker can withdraw', at: t.clearedAt, note: !t.clearedAt && t.clearAt ? `from ${fmt(t.clearAt)}` : undefined },
  ];
}
