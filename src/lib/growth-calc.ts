/**
 * Pure maths and labels for the growth screens (reports, pipeline, team
 * performance, reconciliation). No database access, so it is unit-tested.
 * Money is in paise; a rate with nothing to divide by is null, never 0%, so a
 * quiet week is not shown as a perfect one.
 */

export type DailyRow = {
  day: string;
  newPeople: number;
  jobsPosted: number;
  jobsFinished: number;
  cancellations: number;
  disputesDecided: number;
  fundedMinor: number;
  topupMinor: number;
  revenueMinor: number;
};

export type DailyTotals = Omit<DailyRow, 'day'> & {
  /** TaskDrop's earnings as a share of money paid in for jobs. */
  takeRate: number | null;
  cancelRate: number | null;
  disputeRate: number | null;
  finishRate: number | null;
};

export function rate(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

export function totalDaily(rows: DailyRow[]): DailyTotals {
  const t = { newPeople: 0, jobsPosted: 0, jobsFinished: 0, cancellations: 0, disputesDecided: 0, fundedMinor: 0, topupMinor: 0, revenueMinor: 0 };
  for (const r of rows) {
    t.newPeople += r.newPeople;
    t.jobsPosted += r.jobsPosted;
    t.jobsFinished += r.jobsFinished;
    t.cancellations += r.cancellations;
    t.disputesDecided += r.disputesDecided;
    t.fundedMinor += r.fundedMinor;
    t.topupMinor += r.topupMinor;
    t.revenueMinor += r.revenueMinor;
  }
  return {
    ...t,
    takeRate: rate(t.revenueMinor, t.fundedMinor),
    cancelRate: rate(t.cancellations, t.jobsPosted),
    disputeRate: rate(t.disputesDecided, t.jobsFinished + t.disputesDecided),
    finishRate: rate(t.jobsFinished, t.jobsPosted),
  };
}

/** The same-length window immediately before [from, to], inclusive, as ISO dates. */
export function previousWindow(from: string, to: string): { from: string; to: string } {
  const f = Date.parse(`${from}T00:00:00Z`);
  const t = Date.parse(`${to}T00:00:00Z`);
  const days = Math.round((t - f) / 86400000) + 1;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: iso(f - days * 86400000), to: iso(f - 86400000) };
}

export const PIPELINE_STAGES = [
  { key: 'signed_up', label: 'Signed up', hint: 'Joined, nothing else yet' },
  { key: 'engaged', label: 'Engaged', hint: 'Posted a job or sent an offer' },
  { key: 'funded', label: 'Funded', hint: 'Has a funded job, or was hired' },
  { key: 'completed', label: 'Completed one', hint: 'One finished job' },
  { key: 'repeat', label: 'Repeat', hint: 'Two or more finished jobs' },
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number]['key'];

export type FunnelRow = { joined: number; engaged: number; funded: number; completed: number; repeat: number };

/** Each step with its count, its share of everyone who joined, and the share kept from the step before. */
export function funnelSteps(f: FunnelRow): { label: string; count: number; ofJoined: number | null; ofPrevious: number | null }[] {
  const steps: [string, number][] = [
    ['Joined', f.joined],
    ['Posted or offered', f.engaged],
    ['Had a funded job', f.funded],
    ['Finished a job', f.completed],
    ['Came back for more', f.repeat],
  ];
  return steps.map(([label, count], i) => ({ label, count, ofJoined: rate(count, f.joined), ofPrevious: i === 0 ? null : rate(count, steps[i - 1]?.[1] ?? 0) }));
}

export type RetentionRow = { cohortWeek: string; weekOffset: number; cohortSize: number; active: number };

/** Sign-up weeks as rows, weeks since joining as columns; a cell is the share of that week's sign-ups who were active. */
export function retentionGrid(rows: RetentionRow[], maxOffset = 8): { week: string; size: number; cells: (number | null)[] }[] {
  const weeks = new Map<string, { size: number; cells: (number | null)[] }>();
  for (const r of rows) {
    if (r.weekOffset < 0 || r.weekOffset > maxOffset) continue;
    const w = weeks.get(r.cohortWeek) ?? { size: r.cohortSize, cells: Array<number | null>(maxOffset + 1).fill(null) };
    w.cells[r.weekOffset] = rate(r.active, r.cohortSize);
    weeks.set(r.cohortWeek, w);
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, v]) => ({ week, ...v }));
}

export const RECONCILE_CHECKS: Record<string, { title: string; why: string }> = {
  funded_without_paid_payment: { title: 'Funded without a paid payment', why: 'The job is marked funded but the payment behind it is not paid.' },
  paid_not_credited: { title: 'Paid but not credited', why: 'Razorpay says it was paid, but no wallet credit or job funding was recorded.' },
  payment_stuck_created: { title: 'Payment never completed', why: 'A payment link was made more than two days ago and never paid.' },
  payout_waiting_long: { title: 'Withdrawal waiting too long', why: 'A worker asked to withdraw more than three days ago.' },
  payout_paid_no_reference: { title: 'Paid without a transfer reference', why: 'Marked paid through RazorpayX, but there is no RazorpayX transfer id.' },
  finished_without_commission: { title: 'Finished with no commission booked', why: 'The job finished but TaskDrop’s commission is missing from the ledger.' },
};

export function checkTitle(code: string): string {
  return RECONCILE_CHECKS[code]?.title ?? code.replace(/_/g, ' ');
}

export type StaffPerf = {
  userId: string;
  tasksDone: number;
  tasksOnTime: number;
  tasksOpen: number;
  tasksOverdue: number;
  notes: number;
  ticketReplies: number;
  reportsHandled: number;
  disputesDecided: number;
  suspensions: number;
  broadcasts: number;
  customersOwned: number;
  firstResponseMinutes: number | null;
};

/** Everything a person did in the window, as one number for sorting the table. Not a score to judge people by. */
export function activityTotal(p: StaffPerf): number {
  return p.tasksDone + p.notes + p.ticketReplies + p.reportsHandled + p.disputesDecided + p.suspensions + p.broadcasts;
}

export function formatMinutes(m: number | null): string {
  if (m === null) return '—';
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 60 * 24) return `${(m / 60).toFixed(1)} h`;
  return `${(m / 1440).toFixed(1)} days`;
}

// ------------------------------------------------- marketplace numbers --

/** One row of `admin_marketplace_numbers` (migration 141, plan task 3.3b). */
export type MarketplaceRow = {
  kind: 'all' | 'category' | 'area';
  label: string;
  posted: number;
  withOffer: number;
  filled: number;
  /** Seconds a task waited for its first offer. Null when no task in the group got one. */
  medianFirstOfferSeconds: number | null;
  p90FirstOfferSeconds: number | null;
};

export type MarketplaceShown = MarketplaceRow & {
  /** Tasks done and paid, as a share of tasks posted. Null when nothing was posted. */
  fillRate: number | null;
  /** Tasks that got at least one offer, as a share of tasks posted. */
  offerRate: number | null;
};

/** Adds the two shares, and puts the busiest groups first. */
export function marketplaceShown(rows: MarketplaceRow[], kind: MarketplaceRow['kind']): MarketplaceShown[] {
  return rows
    .filter((r) => r.kind === kind)
    .map((r) => ({ ...r, fillRate: rate(r.filled, r.posted), offerRate: rate(r.withOffer, r.posted) }))
    .sort((a, b) => b.posted - a.posted || a.label.localeCompare(b.label));
}

/** "45 sec", "12 min", "3.5 h", "2.1 days" -- how long a task waited. A dash when no task got an offer. */
export function formatWait(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  return formatMinutes(seconds / 60);
}

/** Checks that describe something still unresolved, so they stay on the list however old they are. The rest are closed history and follow the date range. */
export const OPEN_RECONCILE_CODES: readonly string[] = ['funded_without_paid_payment', 'paid_not_credited', 'payment_stuck_created', 'payout_waiting_long'];

/** The date-range rows plus every still-open problem from any date, once each, newest first. */
export function mergeOpenProblems<T extends { code: string; refType: string; refId: string; at: string | null }>(inWindow: readonly T[], anyDate: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of [...inWindow, ...anyDate.filter((x) => OPEN_RECONCILE_CODES.includes(x.code))]) {
    const key = `${r.code}|${r.refType}|${r.refId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
}
