import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { serviceOrNull, one } from './shared';
import { namesFor } from './people';

// ------------------------------------------------------------------ escrow --

export type EscrowJob = {
  assignmentId: string;
  taskId: string;
  title: string;
  taskStatus: string;
  posterId: string | null;
  poster: string;
  workerId: string;
  worker: string;
  escrowMinor: number;
  funded: boolean;
  fundedAt: string | null;
  autoCompleteAt: string | null;
};

type TaskBits = { title: string; status: string; poster_id: string; funded_at: string | null; auto_complete_at: string | null };
type AssignmentWithTask = { id: string; task_id: string; worker_id: string; escrow_minor: number; tasks: TaskBits | TaskBits[] | null };

/**
 * Jobs whose money is held right now. An assignment exists from the moment a
 * quote is accepted, but money is only really held once the poster has paid
 * (tasks.funded_at), so each job says which it is.
 */
export async function getEscrowJobs(): Promise<EscrowJob[]> {
  const supabase = await createSessionClient();
  const rows: AssignmentWithTask[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, task_id, worker_id, escrow_minor, tasks(title, status, poster_id, funded_at, auto_complete_at)')
      .in('status', ['assigned', 'started'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Could not read escrow: ${error.message}`);
    const page = (data ?? []) as unknown as AssignmentWithTask[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const tasks = rows.map((r) => one(r.tasks));
  const names = await namesFor([...rows.map((r) => r.worker_id), ...tasks.map((t) => t?.poster_id ?? '')]);
  return rows.map((r, i) => {
    const t = tasks[i];
    return {
      assignmentId: r.id,
      taskId: r.task_id,
      title: t?.title ?? 'Untitled job',
      taskStatus: t?.status ?? 'LOCKED',
      posterId: t?.poster_id ?? null,
      poster: (t && names.get(t.poster_id)) ?? 'Poster',
      workerId: r.worker_id,
      worker: names.get(r.worker_id) ?? 'Worker',
      escrowMinor: Number(r.escrow_minor),
      funded: Boolean(t?.funded_at),
      fundedAt: t?.funded_at ?? null,
      autoCompleteAt: t?.auto_complete_at ?? null,
    };
  });
}

// -------------------------------------------------------- money held for users --

export type MoneyHeld = {
  walletBalances: number;
  /** Posters' wallet money (top-ups, refunds): spent on jobs only, never withdrawn. */
  credits: number;
  clearing: number;
  walletsWithMoney: number;
  /** Null when the service key isn't configured (refunds_outstanding is operator-only). */
  refundsOwed: number | null;
  refundsCount: number | null;
};

/** Users' money sitting in TaskDrop's account. */
export async function getMoneyHeld(): Promise<MoneyHeld> {
  const supabase = await createSessionClient();
  let walletBalances = 0;
  let clearing = 0;
  let credits = 0;
  let walletsWithMoney = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance_minor, clearing_minor, credits_minor')
      .order('user_id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Could not read wallets: ${error.message}`);
    const page = (data ?? []) as { balance_minor: number; clearing_minor: number; credits_minor?: number | null }[];
    for (const w of page) {
      walletBalances += Number(w.balance_minor);
      clearing += Number(w.clearing_minor);
      credits += Number(w.credits_minor ?? 0);
      if (Number(w.balance_minor) + Number(w.clearing_minor) + Number(w.credits_minor ?? 0) > 0) walletsWithMoney += 1;
    }
    if (page.length < 1000) break;
  }
  const refunds = await getRefundsOwed();
  return {
    walletBalances,
    credits,
    clearing,
    walletsWithMoney,
    refundsOwed: refunds ? refunds.reduce((a, r) => a + r.dueMinor, 0) : null,
    refundsCount: refunds ? refunds.length : null,
  };
}

export type RefundOwed = {
  taskId: string;
  title: string;
  posterId: string | null;
  poster: string;
  paidMinor: number;
  penaltyMinor: number;
  refundedMinor: number;
  dueMinor: number;
  cancelledAt: string | null;
  providerPaymentId: string | null;
};

/** Posters' money to hand back after a cancellation. Null without the service key. */
export async function getRefundsOwed(): Promise<RefundOwed[] | null> {
  const service = serviceOrNull();
  if (!service) return null;
  const { data, error } = await service
    .from('refunds_outstanding')
    .select('task_id, title, poster_id, amount_minor, penalty_minor, refunded_minor, due_minor, cancelled_at, provider_payment_id')
    .order('cancelled_at', { ascending: true });
  if (error) throw new Error(`Could not read refunds: ${error.message}`);
  type Row = {
    task_id: string | null;
    title: string | null;
    poster_id: string | null;
    amount_minor: number | null;
    penalty_minor: number | null;
    refunded_minor: number | null;
    due_minor: number | null;
    cancelled_at: string | null;
    provider_payment_id: string | null;
  };
  const rows = ((data ?? []) as Row[]).filter((r) => Number(r.due_minor ?? 0) > 0);
  const names = await namesFor(rows.map((r) => r.poster_id ?? ''));
  return rows.map((r) => ({
    taskId: r.task_id ?? '',
    title: r.title ?? 'Cancelled job',
    posterId: r.poster_id,
    poster: (r.poster_id && names.get(r.poster_id)) || 'Poster',
    paidMinor: Number(r.amount_minor ?? 0),
    penaltyMinor: Number(r.penalty_minor ?? 0),
    refundedMinor: Number(r.refunded_minor ?? 0),
    dueMinor: Number(r.due_minor ?? 0),
    cancelledAt: r.cancelled_at,
    providerPaymentId: r.provider_payment_id,
  }));
}
