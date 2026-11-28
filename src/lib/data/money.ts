import 'server-only';
import { cache } from 'react';
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
  // Started now so it runs while the wallets are paged through below. A refund
  // list that fails still fails the card, as before: it is awaited after the loop.
  const refundsRead = getRefundsOwed();
  refundsRead.catch(() => undefined);
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
  const refunds = await refundsRead;
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
export const getRefundsOwed = cache(readRefundsOwed);

// One read per request: the sidebar count in the layout, the dashboard's
// "money held" card and the Refunds page all want this same list.
async function readRefundsOwed(): Promise<RefundOwed[] | null> {
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

// ------------------------------------------------- admin v2: Plan B money moves --

export type V2Read<T> = { data: T; setup: boolean; error: string | null };

const V2_NOT_THERE = /does not exist|could not find the (function|table)|schema cache|PGRST20[24]|42883|42P01/i;

async function v2Rpc<T>(fn: string, args: Record<string, unknown>, empty: T, map: (raw: unknown) => T): Promise<V2Read<T>> {
  const supabase = await createSessionClient();
  // These functions are newer than the generated types (migrations 250 and 251, and Plan B).
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) {
    const setup = V2_NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { data: empty, setup, error: setup ? null : error.message };
  }
  return { data: map(data), setup: false, error: null };
}

const s = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const sn = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const n = (v: unknown): number => (v == null ? 0 : Number(v) || 0);

export type PlanBOverview = {
  flow: 'plan_b' | 'wallet';
  provider: string;
  paused: boolean;
  heldMinor: number;
  counts: Record<string, number>;
};

/** Totals for Plan B (pay per task): what is held at the payment company and how many holds sit in each state. */
export async function getPlanBOverview(): Promise<V2Read<PlanBOverview | null>> {
  return v2Rpc('admin_plan_b_overview', {}, null, (raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries((o.counts ?? {}) as Record<string, unknown>)) counts[k] = n(v);
    return { flow: o.flow === 'plan_b' ? 'plan_b' : 'wallet', provider: s(o.provider), paused: o.paused === true, heldMinor: n(o.held_minor), counts };
  });
}

export type PlanBMove = {
  holdId: string;
  taskId: string;
  title: string;
  posterId: string | null;
  poster: string;
  workerId: string | null;
  worker: string;
  status: string;
  failedFrom: string | null;
  chargedMinor: number;
  releaseMinor: number;
  refundMinor: number;
  attempts: number;
  note: string | null;
  expiresAt: string | null;
  settledAt: string | null;
  updatedAt: string;
};

/** Holds that are moving, failed, just settled or expired (migration 251), failed first. */
export async function getPlanBMoves(limit = 60): Promise<V2Read<PlanBMove[]>> {
  return v2Rpc('admin_plan_b_moves', { p_limit: limit }, [], (raw) =>
    (Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []).map((r) => ({
      holdId: s(r.hold_id),
      taskId: s(r.task_id),
      title: s(r.task_title) || 'A job',
      posterId: sn(r.poster_id),
      poster: s(r.poster_name) || 'Poster',
      workerId: sn(r.worker_id),
      worker: s(r.worker_name) || 'Worker',
      status: s(r.status),
      failedFrom: sn(r.failed_from),
      chargedMinor: n(r.charged_minor),
      releaseMinor: n(r.release_minor),
      refundMinor: n(r.refund_minor),
      attempts: n(r.attempts),
      note: sn(r.note),
      expiresAt: sn(r.expires_at),
      settledAt: sn(r.settled_at),
      updatedAt: s(r.updated_at),
    })),
  );
}

// ------------------------------------------- admin v2: Money check "explained" --

export type MoneyCheckNote = { code: string; refType: string; refId: string | null; at: string | null; note: string; by: string; when: string };

/** Notes staff wrote on Money check lines (migration 250). */
export async function getMoneyCheckNotes(): Promise<V2Read<MoneyCheckNote[]>> {
  return v2Rpc('admin_money_check_explained', { p_limit: 1000 }, [], (raw) =>
    (Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []).map((r) => ({
      code: s(r.check_code),
      refType: s(r.ref_type),
      refId: sn(r.ref_id),
      at: sn(r.at),
      note: s(r.note),
      by: s(r.explained_by_name) || 'Staff',
      when: s(r.explained_at),
    })),
  );
}
