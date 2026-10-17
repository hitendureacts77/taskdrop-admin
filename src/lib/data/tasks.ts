import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { startOfIstDay } from '../days';
import { serviceOrNull, cleanSearch } from './shared';
import { namesFor } from './people';
import { type LedgerEntry } from './activity';

// ------------------------------------------------------------------- tasks --

export const TASK_FILTERS = [
  { key: 'all', label: 'All jobs' },
  { key: 'escrow', label: 'Money held' },
  { key: 'open', label: 'Getting quotes' },
  { key: 'active', label: 'Hired & in progress' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'waiting', label: "Waiting for poster's OK" },
  { key: 'disputed', label: 'Disputed' },
  { key: 'finished', label: 'Finished' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'posted_today', label: 'Posted today' },
  { key: 'finished_today', label: 'Finished today' },
] as const;
export type TaskFilter = (typeof TASK_FILTERS)[number]['key'];

export function parseTaskFilter(v: string | string[] | undefined): TaskFilter {
  const s = Array.isArray(v) ? v[0] : v;
  return (TASK_FILTERS.some((f) => f.key === s) ? s : 'all') as TaskFilter;
}

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  category: string | null;
  place: string | null;
  priceMinor: number | null;
  priceIsAgreed: boolean;
  posterId: string;
  poster: string;
  workerId: string | null;
  worker: string | null;
  createdAt: string;
  updatedAt: string;
  funded: boolean;
  /** What TaskDrop is holding for this job right now (poster paid, not yet released or refunded). */
  heldMinor: number | null;
};

const ACTIVE = ['LOCKED', 'TASK_STARTED', 'OVERDUE', 'REVISION_REQUESTED'];
const HOLDING = ['LOCKED', 'TASK_STARTED', 'OVERDUE', 'WORK_DONE', 'REVISION_REQUESTED', 'DISPUTED'];

export async function getTasks(filter: TaskFilter, search: string | undefined, page: number, pageSize = 30): Promise<{ rows: TaskRow[]; total: number }> {
  const supabase = await createSessionClient();
  const since = startOfIstDay().toISOString();
  let q = supabase
    .from('tasks')
    .select(
      'id, title, status, category, loc_label, locked_minor, benchmark_minor, poster_id, created_at, updated_at, funded_at, assignments(worker_id, created_at, escrow_minor, status)',
      { count: 'exact' },
    );
  switch (filter) {
    case 'escrow':
      q = q.not('funded_at', 'is', null).in('status', HOLDING as never);
      break;
    case 'open':
      q = q.eq('status', 'OPEN');
      break;
    case 'active':
      q = q.in('status', ACTIVE as never);
      break;
    case 'overdue':
      // Same rule as admin_live_counters() (migration 091): marked overdue, or
      // still in progress past its due time.
      q = q.or(`status.eq.OVERDUE,and(status.in.(LOCKED,TASK_STARTED,REVISION_REQUESTED),due_at.lt.${new Date().toISOString()})`);
      break;
    case 'waiting':
      q = q.eq('status', 'WORK_DONE');
      break;
    case 'disputed':
      q = q.eq('status', 'DISPUTED');
      break;
    case 'finished':
      q = q.in('status', ['COMPLETED', 'AUTO_COMPLETED']);
      break;
    case 'cancelled':
      q = q.eq('status', 'CANCELLED');
      break;
    case 'posted_today':
      q = q.gte('created_at', since);
      break;
    case 'finished_today':
      q = q.in('status', ['COMPLETED', 'AUTO_COMPLETED']).gte('completed_at', since);
      break;
  }
  const s = cleanSearch(search);
  if (s) q = q.ilike('title', `%${s}%`);
  const from = page * pageSize;
  const { data, error, count } = await q.order('updated_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw new Error(`Could not read jobs: ${error.message}`);
  type A = { worker_id: string; created_at: string; escrow_minor: number; status: string };
  type Row = {
    id: string;
    title: string;
    status: string;
    category: string | null;
    loc_label: string | null;
    locked_minor: number | null;
    benchmark_minor: number;
    poster_id: string;
    created_at: string;
    updated_at: string;
    funded_at: string | null;
    assignments: A[] | A | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const latestOf = (r: Row) => {
    const list = Array.isArray(r.assignments) ? [...r.assignments] : r.assignments ? [r.assignments] : [];
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  };
  const workerOf = (r: Row) => latestOf(r)?.worker_id ?? null;
  const names = await namesFor([...rows.map((r) => r.poster_id), ...rows.map((r) => workerOf(r) ?? '')]);
  return {
    total: count ?? rows.length,
    rows: rows.map((r) => {
      const w = workerOf(r);
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        category: r.category,
        place: r.loc_label,
        priceMinor: r.locked_minor != null ? Number(r.locked_minor) : Number(r.benchmark_minor) || null,
        priceIsAgreed: r.locked_minor != null,
        posterId: r.poster_id,
        poster: names.get(r.poster_id) ?? 'Poster',
        workerId: w,
        worker: w ? names.get(w) ?? 'Worker' : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        funded: Boolean(r.funded_at),
        heldMinor: (() => {
          const a = latestOf(r);
          return r.funded_at && a && (a.status === 'assigned' || a.status === 'started') ? Number(a.escrow_minor) : null;
        })(),
      };
    }),
  };
}

export type TaskDetail = {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string | null;
  place: string | null;
  kind: string;
  lockedMinor: number | null;
  budgetMinor: number;
  posterId: string;
  poster: string;
  createdAt: string;
  fundedAt: string | null;
  startedAt: string | null;
  workDoneAt: string | null;
  completedAt: string | null;
  autoCompleteAt: string | null;
  clearAt: string | null;
  clearedAt: string | null;
  dueAt: string | null;
  assignment: { id: string; workerId: string; worker: string; escrowMinor: number; status: string; createdAt: string } | null;
  quotes: { id: string; workerId: string; worker: string; priceMinor: number; message: string | null; chosen: boolean; createdAt: string }[];
  ledger: LedgerEntry[];
  payment: { amountMinor: number; status: string; paidAt: string | null; providerPaymentId: string | null; refundedMinor: number } | null;
  reviews: { rating: number; comment: string | null; aboutRole: string; author: string; createdAt: string }[];
};

export const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
/** A Postgres timestamptz as PostgREST prints it, e.g. 2026-09-27T12:23:00.123456+00:00. Nothing else gets into a filter string. */
export const isTimestamp = (v: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(v);

export async function getTask(id: string): Promise<TaskDetail | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSessionClient();
  const { data: task, error } = await supabase
    .from('tasks')
    .select(
      'id, title, description, status, category, loc_label, kind, locked_minor, benchmark_minor, poster_id, created_at, funded_at, started_at, work_done_at, completed_at, auto_complete_at, clear_at, cleared_at, due_at, locked_bid_id, funding_payment_id',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not read that job: ${error.message}`);
  if (!task) return null;
  const t = task as unknown as {
    id: string;
    title: string;
    description: string;
    status: string;
    category: string | null;
    loc_label: string | null;
    kind: string;
    locked_minor: number | null;
    benchmark_minor: number;
    poster_id: string;
    created_at: string;
    funded_at: string | null;
    started_at: string | null;
    work_done_at: string | null;
    completed_at: string | null;
    auto_complete_at: string | null;
    clear_at: string | null;
    cleared_at: string | null;
    due_at: string | null;
    locked_bid_id: string | null;
    funding_payment_id: string | null;
  };

  const [assignments, bids, ledgerRows, reviews] = await Promise.all([
    supabase.from('assignments').select('id, worker_id, escrow_minor, status, created_at').eq('task_id', id).order('created_at', { ascending: false }).limit(1),
    supabase.from('bids').select('id, worker_id, price_minor, message, created_at, is_locked').eq('task_id', id).order('created_at', { ascending: true }).limit(100),
    supabase.from('platform_ledger').select('id, kind, amount_minor, note, created_at, task_id').eq('task_id', id).order('created_at', { ascending: true }),
    supabase.from('reviews').select('rating, comment, about_role, author_id, created_at').eq('task_id', id),
  ]);

  const a = ((assignments.data ?? []) as { id: string; worker_id: string; escrow_minor: number; status: string; created_at: string }[])[0] ?? null;
  const bidRows = (bids.data ?? []) as { id: string; worker_id: string; price_minor: number; message: string | null; created_at: string; is_locked: boolean }[];
  const reviewRows = (reviews.data ?? []) as { rating: number; comment: string | null; about_role: string; author_id: string; created_at: string }[];
  const names = await namesFor([t.poster_id, a?.worker_id ?? '', ...bidRows.map((b) => b.worker_id), ...reviewRows.map((r) => r.author_id)]);

  // payments are own-rows only in RLS; read with the service key when it's there.
  let payment: TaskDetail['payment'] = null;
  const service = serviceOrNull();
  if (service && t.funding_payment_id) {
    // The payment that actually funded the job, not just the newest link the poster opened.
    const { data: pay } = await service
      .from('payments')
      .select('amount_minor, status, paid_at, provider_payment_id, refunded_minor, created_at')
      .eq('id', t.funding_payment_id)
      .limit(1);
    const p = ((pay ?? []) as { amount_minor: number; status: string; paid_at: string | null; provider_payment_id: string | null; refunded_minor: number }[])[0];
    if (p) payment = { amountMinor: Number(p.amount_minor), status: p.status, paidAt: p.paid_at, providerPaymentId: p.provider_payment_id, refundedMinor: Number(p.refunded_minor) };
  }

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    category: t.category,
    place: t.loc_label,
    kind: t.kind,
    lockedMinor: t.locked_minor != null ? Number(t.locked_minor) : null,
    budgetMinor: Number(t.benchmark_minor ?? 0),
    posterId: t.poster_id,
    poster: names.get(t.poster_id) ?? 'Poster',
    createdAt: t.created_at,
    fundedAt: t.funded_at,
    startedAt: t.started_at,
    workDoneAt: t.work_done_at,
    completedAt: t.completed_at,
    autoCompleteAt: t.auto_complete_at,
    clearAt: t.clear_at,
    clearedAt: t.cleared_at,
    dueAt: t.due_at,
    assignment: a
      ? { id: a.id, workerId: a.worker_id, worker: names.get(a.worker_id) ?? 'Worker', escrowMinor: Number(a.escrow_minor), status: a.status, createdAt: a.created_at }
      : null,
    quotes: bidRows.map((b) => ({
      id: b.id,
      workerId: b.worker_id,
      worker: names.get(b.worker_id) ?? 'Worker',
      priceMinor: Number(b.price_minor),
      message: b.message,
      chosen: b.is_locked || b.id === t.locked_bid_id,
      createdAt: b.created_at,
    })),
    ledger: ((ledgerRows.data ?? []) as { id: string; kind: string; amount_minor: number; note: string | null; created_at: string; task_id: string | null }[]).map((r) => ({
      id: r.id,
      kind: r.kind,
      amount: Number(r.amount_minor),
      note: r.note,
      taskId: r.task_id,
      title: t.title,
      at: r.created_at,
    })),
    payment,
    reviews: reviewRows.map((r) => ({ rating: r.rating, comment: r.comment, aboutRole: r.about_role, author: names.get(r.author_id) ?? 'Someone', createdAt: r.created_at })),
  };
}
