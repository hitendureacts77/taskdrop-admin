import 'server-only';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkAdmin, type AdminUser } from './auth';
import { createClient as createSessionClient } from './supabase/server';
import { createClient as createServiceClient } from './supabase/service';
import { addIstDays, istDayKey, istFormat, startOfIstDay } from './days';
import { ledgerKind } from './labels';

/**
 * Every read the admin panel makes, in one place.
 *
 * Almost everything goes through the session client, so RLS applies as the
 * signed-in admin: the database already lets an admin read platform_ledger,
 * payouts, wallets, assignments, tasks, bids, support tickets, promotions,
 * wallet_adjustments and settings (private.is_admin() in each policy), and
 * profiles and reviews are public. The admin-only RPCs (platform_stats,
 * platform_earnings, admin_payout_queue) check private.is_admin() themselves.
 *
 * The service client is used, read-only, for exactly three things an admin
 * session cannot see: refunds_outstanding (revoked from every signed-in role in
 * migration 036), payments (own-rows only), and a person's email and phone
 * (auth.users). Each of those returns null when SUPABASE_SERVICE_ROLE_KEY isn't
 * set, and the page says so instead of crashing.
 *
 * Every page calls requireAdmin() itself before loading anything: a Next
 * layout's redirect does not stop the page beside it from rendering on the
 * server, so the check has to live next to the data.
 */

export async function requireAdmin(): Promise<AdminUser> {
  const check = await checkAdmin();
  if (check.status === 'unauthenticated') redirect('/login');
  if (check.status === 'forbidden') redirect('/not-authorized');
  return check.user;
}

function serviceOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

export const hasServiceKey = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Strip characters that would break a PostgREST filter string. */
function cleanSearch(q: string | undefined): string {
  return (q ?? '').replace(/[,()*%\\:"']/g, ' ').trim().slice(0, 80);
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

// ------------------------------------------------------------------ totals --

export type AllTime = { total: number; commission: number; fee: number; promotionsAndOther: number; orders: number };

/** Everything TaskDrop has ever earned: the sum of the company ledger, added up by the database. */
export async function getAllTimeEarnings(): Promise<AllTime> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc('platform_earnings');
  if (error) throw new Error(`Could not read total earnings: ${error.message}`);
  type Row = { balance_minor: number; commission_minor: number; poster_fee_minor: number; orders: number };
  const row = one(data as unknown as Row | Row[]);
  const total = Number(row?.balance_minor ?? 0);
  const commission = Number(row?.commission_minor ?? 0);
  const fee = Number(row?.poster_fee_minor ?? 0);
  return { total, commission, fee, promotionsAndOther: total - commission - fee, orders: Number(row?.orders ?? 0) };
}

export type PlatformStats = {
  windowDays: number;
  gmvMinor: number;
  revenueMinor: number;
  tasksPosted: number;
  tasksCompleted: number;
  tasksCancelled: number;
  tasksOpen: number;
  tasksLive: number;
  disputesOpen: number;
  quotesPlaced: number;
  quotedRate: number;
  newUsers: number;
  totalUsers: number;
  activeUsers: number;
  avgWorkerRating: number;
};

export async function getPlatformStats(days = 30): Promise<PlatformStats> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc('platform_stats', { p_days: days });
  if (error) throw new Error(`Could not read platform stats: ${error.message}`);
  const j = (data ?? {}) as Record<string, unknown>;
  const n = (k: string) => Number(j[k] ?? 0);
  return {
    windowDays: n('windowDays'),
    gmvMinor: n('gmvMinor'),
    revenueMinor: n('revenueMinor'),
    tasksPosted: n('tasksPosted'),
    tasksCompleted: n('tasksCompleted'),
    tasksCancelled: n('tasksCancelled'),
    tasksOpen: n('tasksOpen'),
    tasksLive: n('tasksLive'),
    disputesOpen: n('disputesOpen'),
    quotesPlaced: n('quotesPlaced'),
    quotedRate: n('quotedRate'),
    newUsers: n('newUsers'),
    totalUsers: n('totalUsers'),
    activeUsers: n('activeUsers'),
    avgWorkerRating: n('avgWorkerRating'),
  };
}

/** What TaskDrop booked since a moment, from the company ledger (platform_stats' revenue figure uses a fixed old rate). */
export async function getEarnedSince(since: Date): Promise<number> {
  const supabase = await createSessionClient();
  let total = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('platform_ledger')
      .select('amount_minor')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Could not read the company ledger: ${error.message}`);
    const page = (data ?? []) as { amount_minor: number }[];
    for (const r of page) total += Number(r.amount_minor);
    if (page.length < 1000) break;
  }
  return total;
}

export type TodayCounts = { jobsFinished: number; jobsPosted: number; newPeople: number; availableNow: number; waitingApproval: number };

/** Today's activity, counted from Indian midnight. */
export async function getTodayCounts(): Promise<TodayCounts> {
  const supabase = await createSessionClient();
  const since = startOfIstDay().toISOString();
  const now = new Date().toISOString();
  const [finished, posted, people, available, waiting] = await Promise.all([
    supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['COMPLETED', 'AUTO_COMPLETED']).gte('completed_at', since),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('live_until', now),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'WORK_DONE'),
  ]);
  return {
    jobsFinished: finished.count ?? 0,
    jobsPosted: posted.count ?? 0,
    newPeople: people.count ?? 0,
    availableNow: available.count ?? 0,
    waitingApproval: waiting.count ?? 0,
  };
}

// ----------------------------------------------------------------- payouts --

export type QueuedPayout = {
  id: string;
  user_id: string;
  display_name: string | null;
  amount_minor: number;
  status: string;
  snapshot: string | null;
  kind: string | null;
  upi_id: string | null;
  account_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  requested_at: string;
  /** From migration 066: 'razorpayx' (RazorpayX sends and settles it) or 'manual' (a person pays it). */
  via?: string | null;
  attempts?: number | null;
  last_attempt_at?: string | null;
  provider_payout_id?: string | null;
  /** RazorpayX's own word: queued, pending, processing, ... */
  provider_status?: string | null;
  provider_status_at?: string | null;
  failure_note?: string | null;
  has_pan?: boolean | null;
};

/** Every withdrawal still owed, with the full UPI id / bank details needed to send it. */
export async function getPayoutQueue(): Promise<QueuedPayout[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc('admin_payout_queue');
  if (error) throw new Error(`Could not read the payout queue: ${error.message}`);
  return ((data ?? []) as unknown as QueuedPayout[]).map((p) => ({ ...p, amount_minor: Number(p.amount_minor) }));
}

export type PayoutTotals = { todayMinor: number; todayCount: number; totalMinor: number; totalCount: number };

/** What has actually reached workers: payouts marked paid, today and ever. */
export async function getPayoutTotals(): Promise<PayoutTotals> {
  const supabase = await createSessionClient();
  const since = startOfIstDay().getTime();
  const out: PayoutTotals = { todayMinor: 0, todayCount: 0, totalMinor: 0, totalCount: 0 };
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('payouts')
      .select('amount_minor, updated_at')
      .eq('status', 'paid')
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Could not read payouts: ${error.message}`);
    const page = (data ?? []) as { amount_minor: number; updated_at: string }[];
    for (const p of page) {
      out.totalMinor += Number(p.amount_minor);
      out.totalCount += 1;
      if (new Date(p.updated_at).getTime() >= since) {
        out.todayMinor += Number(p.amount_minor);
        out.todayCount += 1;
      }
    }
    if (page.length < 1000) break;
  }
  return out;
}

export type SettledPayout = {
  id: string;
  user_id: string;
  name: string;
  amount_minor: number;
  status: string;
  destination: string | null;
  reference: string | null;
  failure_note: string | null;
  updated_at: string;
  created_at?: string;
  /** From migration 066; absent before it is applied. */
  via?: string | null;
  fee_minor?: number | null;
  tax_minor?: number | null;
  reversed_at?: string | null;
};

/** Payouts that were paid, failed or cancelled (or, for one person, all of theirs), newest first. */
export async function getSettledPayouts(since: Date | null, limit = 100, userId?: string): Promise<SettledPayout[]> {
  const supabase = await createSessionClient();
  const run = (cols: string) => {
    let query = supabase.from('payouts').select(cols).order('updated_at', { ascending: false }).limit(limit);
    query = userId ? query.eq('user_id', userId) : query.in('status', ['paid', 'failed', 'cancelled']);
    if (since) query = query.gte('updated_at', since.toISOString());
    return query;
  };
  const base = 'id, user_id, amount_minor, status, destination, reference, failure_note, updated_at';
  let { data, error } = await run(`${base}, via, fee_minor, tax_minor, reversed_at`);
  // Before migration 066 those columns do not exist yet.
  if (error && /column .* does not exist/i.test(error.message)) ({ data, error } = await run(base));
  if (error) throw new Error(`Could not read payouts: ${error.message}`);
  // The column list is built at run time, so supabase-js can't type the rows.
  const rows = (data ?? []) as unknown as Omit<SettledPayout, 'name'>[];
  const names = await namesFor(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    ...r,
    amount_minor: Number(r.amount_minor),
    fee_minor: r.fee_minor == null ? null : Number(r.fee_minor),
    tax_minor: r.tax_minor == null ? null : Number(r.tax_minor),
    name: names.get(r.user_id) ?? 'Someone',
  }));
}

/** What TaskDrop holds for other people, in paise (migration 066's admin_money_position). */
export type MoneyPosition = {
  creditsMinor: number;
  earningsMinor: number;
  clearingMinor: number;
  lockedMinor: number;
  inFlightMinor: number;
  refundsOwedMinor: number;
  unappliedMinor: number;
  heldForPeopleMinor: number;
  readyToWithdrawMinor: number;
  taskdropEarnedMinor: number;
};

/** Null until migration 066 is applied. */
export async function getMoneyPosition(): Promise<MoneyPosition | null> {
  const supabase = await createSessionClient();
  // Not in the generated types until migration 066 is applied to the database.
  const { data, error } = await supabase.rpc('admin_money_position' as never);
  if (error) return null;
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, number | string> | null;
  if (!r) return null;
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    creditsMinor: n('credits_minor'),
    earningsMinor: n('earnings_minor'),
    clearingMinor: n('clearing_minor'),
    lockedMinor: n('locked_minor'),
    inFlightMinor: n('in_flight_minor'),
    refundsOwedMinor: n('refunds_owed_minor'),
    unappliedMinor: n('unapplied_minor'),
    heldForPeopleMinor: n('held_for_people_minor'),
    readyToWithdrawMinor: n('ready_to_withdraw_minor'),
    taskdropEarnedMinor: n('taskdrop_earned_minor'),
  };
}

export type RazorpayXState = { configured: boolean; balanceMinor: number | null; error: string | null };

/** The RazorpayX account balance, read live through the razorpayx-payouts function. */
export async function getRazorpayXState(): Promise<RazorpayXState> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.functions.invoke('razorpayx-payouts', { body: { action: 'balance' } });
  if (error) return { configured: true, balanceMinor: null, error: `Could not reach the payout service: ${error.message}` };
  const out = (data ?? {}) as { configured?: boolean; ok?: boolean; balanceMinor?: number | null; error?: string };
  if (out.configured === false) return { configured: false, balanceMinor: null, error: null };
  if (out.ok === false || out.balanceMinor == null) return { configured: true, balanceMinor: null, error: out.error ?? 'RazorpayX did not answer' };
  return { configured: true, balanceMinor: Number(out.balanceMinor), error: null };
}

export type PayoutMethod = 'manual' | 'razorpayx';

/** How new withdrawals are paid. Manual unless an admin has switched it to RazorpayX. */
export async function getPayoutMethod(): Promise<PayoutMethod> {
  const supabase = await createSessionClient();
  const { data } = await supabase.from('settings').select('value').eq('key', 'payout_method').maybeSingle();
  return (data as { value: unknown } | null)?.value === 'razorpayx' ? 'razorpayx' : 'manual';
}

/** Whether each person is a worker, a poster or both, so a withdrawal says who asked for it. */
export async function getRolesFor(ids: string[]): Promise<Record<string, string[]>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out: Record<string, string[]> = {};
  if (!unique.length) return out;
  const supabase = await createSessionClient();
  for (let i = 0; i < unique.length; i += 200) {
    const { data } = await supabase.from('user_roles').select('user_id, role').in('user_id', unique.slice(i, i + 200));
    for (const r of (data ?? []) as { user_id: string; role: string }[]) {
      if (r.role === 'worker' || r.role === 'poster') (out[r.user_id] ??= []).push(r.role);
    }
  }
  return out;
}

export type WithdrawalDay = { key: string; long: string; short: string; minor: number; count: number };

/** Every withdrawal asked for in the last `days` Indian days (any outcome), added up per day, oldest first. */
export async function getWithdrawalRequestsDaily(days: number): Promise<WithdrawalDay[]> {
  const supabase = await createSessionClient();
  const first = addIstDays(startOfIstDay(), -(days - 1));
  const byDay = new Map<string, { minor: number; count: number }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('payouts')
      .select('amount_minor, created_at')
      .gte('created_at', first.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Could not read withdrawal requests: ${error.message}`);
    const page = (data ?? []) as { amount_minor: number; created_at: string }[];
    for (const p of page) {
      const key = istDayKey(p.created_at);
      const cur = byDay.get(key) ?? { minor: 0, count: 0 };
      cur.minor += Number(p.amount_minor);
      cur.count += 1;
      byDay.set(key, cur);
    }
    if (page.length < 1000) break;
  }
  return Array.from({ length: days }, (_, i) => {
    const at = addIstDays(first, i);
    const key = istDayKey(at);
    const v = byDay.get(key) ?? { minor: 0, count: 0 };
    return {
      key,
      long: istFormat(at, { weekday: 'short', day: 'numeric', month: 'short' }),
      short: istFormat(at, { day: 'numeric', month: 'short' }),
      ...v,
    };
  });
}

export type PayoutRecord = {
  id: string;
  user_id: string;
  amount_minor: number;
  status: string;
  destination: string | null;
  reference: string | null;
  failure_note: string | null;
  created_at: string;
  updated_at: string;
  via?: string | null;
  attempts?: number | null;
  last_attempt_at?: string | null;
  provider_payout_id?: string | null;
  provider_status?: string | null;
  fee_minor?: number | null;
  tax_minor?: number | null;
  reversed_at?: string | null;
};

export type PayoutDetail = {
  p: PayoutRecord;
  name: string;
  roles: string[];
  /** Present while the withdrawal is open: it carries the full UPI id / bank details to pay into. */
  queued: QueuedPayout | null;
  walletMinor: number | null;
  others: SettledPayout[];
};

/** One withdrawal, everything needed to pay it or explain what happened to it. */
export async function getPayoutDetail(id: string): Promise<PayoutDetail | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('payouts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not read that withdrawal: ${error.message}`);
  if (!data) return null;
  const raw = data as unknown as PayoutRecord;
  const p: PayoutRecord = {
    ...raw,
    amount_minor: Number(raw.amount_minor),
    fee_minor: raw.fee_minor == null ? null : Number(raw.fee_minor),
    tax_minor: raw.tax_minor == null ? null : Number(raw.tax_minor),
  };
  const open = p.status === 'requested' || p.status === 'processing';
  const [names, roles, queue, wallet, others] = await Promise.all([
    namesFor([p.user_id]),
    getRolesFor([p.user_id]),
    open ? getPayoutQueue() : Promise.resolve([] as QueuedPayout[]),
    supabase.from('wallets').select('balance_minor').eq('user_id', p.user_id).maybeSingle(),
    getSettledPayouts(null, 10, p.user_id),
  ]);
  const w = wallet.data as { balance_minor: number } | null;
  return {
    p,
    name: names.get(p.user_id) ?? 'Someone',
    roles: roles[p.user_id] ?? [],
    queued: queue.find((q) => q.id === p.id) ?? null,
    walletMinor: w ? Number(w.balance_minor) : null,
    others: others.filter((o) => o.id !== p.id),
  };
}

/** Every withdrawal asked for on one Indian calendar day ("2026-10-04"), newest first. */
export async function getWithdrawalRequestsOn(dayKey: string): Promise<SettledPayout[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return [];
  const [y, m, d] = dayKey.split('-').map(Number) as [number, number, number];
  const start = startOfIstDay(new Date(Date.UTC(y, m - 1, d, 12)));
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('payouts')
    .select('id, user_id, amount_minor, status, destination, reference, failure_note, updated_at, created_at')
    .gte('created_at', start.toISOString())
    .lt('created_at', addIstDays(start, 1).toISOString())
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not read that day’s withdrawals: ${error.message}`);
  const rows = (data ?? []) as unknown as (Omit<SettledPayout, 'name'> & { created_at: string })[];
  const names = await namesFor(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, amount_minor: Number(r.amount_minor), name: names.get(r.user_id) ?? 'Someone' }));
}

// ----------------------------------------------------------------- people --

export async function namesFor(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const supabase = await createSessionClient();
  for (let i = 0; i < unique.length; i += 200) {
    // profiles are public by design (profiles_select_all), so no service key needed.
    const { data } = await supabase.from('profiles').select('id, display_name').in('id', unique.slice(i, i + 200));
    for (const p of (data ?? []) as { id: string; display_name: string }[]) out.set(p.id, p.display_name);
  }
  return out;
}

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

// --------------------------------------------------------------- settings --

export type MoneySettings = { commissionPct: number; posterFeePct: number; clearingDays: number; reviewDays: number };

/** The live percentages and waiting periods, so every explanation on screen matches the database. */
export async function getMoneySettings(): Promise<MoneySettings> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['worker_commission_pct', 'poster_service_fee_pct', 'clearing_period_days', 'review_window_days']);
  const map = new Map(((data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, Number(r.value)]));
  const val = (k: string, fallback: number) => {
    const v = map.get(k);
    return v === undefined || Number.isNaN(v) ? fallback : v;
  };
  return {
    commissionPct: val('worker_commission_pct', 0.2), // the database's own fallback
    posterFeePct: val('poster_service_fee_pct', 0.03),
    clearingDays: val('clearing_period_days', 7),
    reviewDays: val('review_window_days', 3),
  };
}

export type SettingRow = { key: string; value: unknown; updated_at: string };

export async function getAllSettings(): Promise<SettingRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('settings').select('key, value, updated_at').order('key');
  if (error) throw new Error(`Could not read settings: ${error.message}`);
  return (data ?? []) as SettingRow[];
}

// ---------------------------------------------------------------- activity --

export type Movement = {
  at: string;
  what: string;
  detail: string;
  amount: number;
  tone: 'green' | 'gold' | 'blue' | 'red' | 'grey';
  status: string;
  href: string | null;
};

/** The latest money events: what TaskDrop earned, and payouts to workers. */
export async function getLatestMovements(limit = 8): Promise<Movement[]> {
  const supabase = await createSessionClient();
  const [ledger, payouts] = await Promise.all([
    supabase
      .from('platform_ledger')
      .select('kind, amount_minor, note, created_at, task_id, tasks(title)')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('payouts')
      .select('id, user_id, amount_minor, status, destination, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit),
  ]);
  const payoutRows = (payouts.data ?? []) as { id: string; user_id: string; amount_minor: number; status: string; destination: string | null; updated_at: string }[];
  const names = await namesFor(payoutRows.map((p) => p.user_id));
  const out: Movement[] = [];
  type LedgerMove = { kind: string; amount_minor: number; note: string | null; created_at: string; task_id: string | null; tasks: { title: string } | { title: string }[] | null };
  for (const l of (ledger.data ?? []) as unknown as LedgerMove[]) {
    const task = one(l.tasks);
    const negative = Number(l.amount_minor) < 0;
    out.push({
      at: l.created_at,
      what: `${ledgerKind(l.kind).label} earned`,
      detail: task?.title ?? l.note ?? '',
      amount: Number(l.amount_minor),
      tone: negative ? 'grey' : 'green',
      status: negative ? 'Taken back' : "TaskDrop's",
      href: l.task_id ? `/tasks/${l.task_id}` : null,
    });
  }
  const PAYOUT: Record<string, [string, Movement['tone']]> = {
    requested: ['Waiting to be sent', 'gold'],
    processing: ['Being sent', 'blue'],
    paid: ['Paid', 'green'],
    failed: ['Back in their wallet', 'red'],
    cancelled: ['Cancelled by them', 'grey'],
  };
  for (const p of payoutRows) {
    const [status, tone] = PAYOUT[p.status] ?? ['Updated', 'grey'];
    out.push({
      at: p.updated_at,
      what: p.status === 'requested' ? 'Asked to withdraw' : 'Withdrawal',
      detail: `${names.get(p.user_id) ?? 'Someone'}${p.destination ? ` · ${p.destination}` : ''}`,
      amount: Number(p.amount_minor),
      tone,
      status,
      href: `/payouts/${p.id}`,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export type LedgerEntry = { id: string; kind: string; amount: number; note: string | null; taskId: string | null; title: string | null; at: string };

/** The company ledger, newest first, optionally one kind and/or a time window. */
export async function getLedger(
  opts: { kind?: string; since?: Date; before?: string; after?: { at: string; id: string }; limit?: number } = {},
): Promise<LedgerEntry[]> {
  const supabase = await createSessionClient();
  let q = supabase
    .from('platform_ledger')
    .select('id, kind, amount_minor, note, created_at, task_id, tasks(title)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.since) q = q.gte('created_at', opts.since.toISOString());
  if (opts.before) q = q.lt('created_at', opts.before);
  // Keyset paging on (created_at, id): commission and fee rows from one job share a timestamp.
  if (opts.after && isTimestamp(opts.after.at) && isUuid(opts.after.id)) {
    q = q.or(`created_at.lt."${opts.after.at}",and(created_at.eq."${opts.after.at}",id.lt.${opts.after.id})`);
  }
  const { data, error } = await q;
  if (error) throw new Error(`Could not read the company ledger: ${error.message}`);
  type Row = { id: string; kind: string; amount_minor: number; note: string | null; created_at: string; task_id: string | null; tasks: { title: string } | { title: string }[] | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    amount: Number(r.amount_minor),
    note: r.note,
    taskId: r.task_id,
    title: one(r.tasks)?.title ?? null,
    at: r.created_at,
  }));
}

// ------------------------------------------------------------------- tasks --

export const TASK_FILTERS = [
  { key: 'all', label: 'All jobs' },
  { key: 'escrow', label: 'Money held' },
  { key: 'open', label: 'Getting quotes' },
  { key: 'active', label: 'Hired & in progress' },
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

// ------------------------------------------------------------------- users --

export const USER_FILTERS = [
  { key: 'all', label: 'Everyone' },
  { key: 'new_today', label: 'Joined today' },
  { key: 'available', label: 'Available now' },
  { key: 'workers', label: 'Workers' },
  { key: 'money', label: 'Money in wallet' },
  { key: 'admins', label: 'Admins' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'deleted', label: 'Deleted' },
] as const;
export type UserFilter = (typeof USER_FILTERS)[number]['key'];

export function parseUserFilter(v: string | string[] | undefined): UserFilter {
  const s = Array.isArray(v) ? v[0] : v;
  return (USER_FILTERS.some((f) => f.key === s) ? s : 'all') as UserFilter;
}

export type UserRow = {
  id: string;
  name: string;
  username: string | null;
  place: string | null;
  joinedAt: string;
  lastSeenAt: string | null;
  availableNow: boolean;
  isWorker: boolean;
  workerRating: number;
  workerReviews: number;
  posterRating: number;
  posterReviews: number;
  walletMinor: number;
  clearingMinor: number;
  /** When the account was deleted (migration 087), or null. */
  deletedAt: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string;
  username: string | null;
  loc_label: string | null;
  created_at: string;
  last_seen_at: string | null;
  live_until: string | null;
  worker_onboarded_at: string | null;
  worker_rating_avg: number;
  worker_rating_count: number;
  poster_rating_avg: number;
  poster_rating_count: number;
  deleted_at: string | null;
};
const PROFILE_COLS =
  'id, display_name, username, loc_label, created_at, last_seen_at, live_until, worker_onboarded_at, worker_rating_avg, worker_rating_count, poster_rating_avg, poster_rating_count, deleted_at';

function toUserRow(p: ProfileRow, wallet: { b: number; c: number } | undefined, now: number): UserRow {
  return {
    id: p.id,
    name: p.display_name,
    username: p.username,
    place: p.loc_label,
    joinedAt: p.created_at,
    lastSeenAt: p.last_seen_at,
    availableNow: Boolean(p.live_until && new Date(p.live_until).getTime() > now),
    isWorker: Boolean(p.worker_onboarded_at),
    workerRating: Number(p.worker_rating_avg ?? 0),
    workerReviews: Number(p.worker_rating_count ?? 0),
    posterRating: Number(p.poster_rating_avg ?? 0),
    posterReviews: Number(p.poster_rating_count ?? 0),
    walletMinor: wallet?.b ?? 0,
    clearingMinor: wallet?.c ?? 0,
    deletedAt: p.deleted_at ?? null,
  };
}

/**
 * `restrict` narrows the list to these people (a tag, or the suspended): the
 * caller works the ids out, so this file stays free of the CRM tables.
 */
export async function getUsers(
  filter: UserFilter,
  search: string | undefined,
  page: number,
  pageSize = 30,
  restrict?: string[] | null,
): Promise<{ rows: UserRow[]; total: number }> {
  const supabase = await createSessionClient();
  let restrictTo: string[] | null = null;
  if (filter === 'admins') {
    const { data } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    restrictTo = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
  } else if (filter === 'money') {
    // Page through the wallets themselves (largest first), then fetch just this page's people,
    // so the list works however many wallets hold money.
    const from = page * pageSize;
    if (restrict && !restrict.length) return { rows: [], total: 0 };
    let wq = supabase
      .from('wallets')
      .select('user_id, balance_minor, clearing_minor', { count: 'exact' })
      .or('balance_minor.gt.0,clearing_minor.gt.0');
    if (restrict) wq = wq.in('user_id', restrict);
    const { data: w, error: wErr, count } = await wq
      .order('balance_minor', { ascending: false })
      .order('user_id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (wErr) throw new Error(`Could not read wallets: ${wErr.message}`);
    const wallets = (w ?? []) as { user_id: string; balance_minor: number; clearing_minor: number }[];
    if (!wallets.length) return { rows: [], total: count ?? 0 };
    const { data: profs, error: pErr } = await supabase.from('profiles').select(PROFILE_COLS).in('id', wallets.map((x) => x.user_id));
    if (pErr) throw new Error(`Could not read people: ${pErr.message}`);
    const byId = new Map(((profs ?? []) as unknown as ProfileRow[]).map((p) => [p.id, p]));
    const now = Date.now();
    return {
      total: count ?? wallets.length,
      rows: wallets.flatMap((x) => {
        const p = byId.get(x.user_id);
        return p ? [toUserRow(p, { b: Number(x.balance_minor), c: Number(x.clearing_minor) }, now)] : [];
      }),
    };
  }
  if (restrict) restrictTo = restrictTo ? restrictTo.filter((id) => restrict.includes(id)) : restrict;
  if (restrictTo && !restrictTo.length) return { rows: [], total: 0 };

  let q = supabase.from('profiles').select(PROFILE_COLS, { count: 'exact' });
  if (restrictTo) q = q.in('id', restrictTo);
  if (filter === 'new_today') q = q.gte('created_at', startOfIstDay().toISOString());
  if (filter === 'available') q = q.gt('live_until', new Date().toISOString());
  if (filter === 'workers') q = q.not('worker_onboarded_at', 'is', null);
  if (filter === 'deleted') q = q.not('deleted_at', 'is', null);
  const s = cleanSearch(search);
  if (s) q = q.or(`display_name.ilike.%${s}%,username.ilike.%${s}%`);
  const from = page * pageSize;
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw new Error(`Could not read people: ${error.message}`);
  const rows = (data ?? []) as unknown as ProfileRow[];
  const wallets = new Map<string, { b: number; c: number }>();
  if (rows.length) {
    const { data: w } = await supabase.from('wallets').select('user_id, balance_minor, clearing_minor').in('user_id', rows.map((r) => r.id));
    for (const x of (w ?? []) as { user_id: string; balance_minor: number; clearing_minor: number }[]) {
      wallets.set(x.user_id, { b: Number(x.balance_minor), c: Number(x.clearing_minor) });
    }
  }
  const now = Date.now();
  return { total: count ?? rows.length, rows: rows.map((p) => toUserRow(p, wallets.get(p.id), now)) };
}

export type UserDetail = UserRow & {
  bio: string | null;
  roles: string[];
  email: string | null;
  phone: string | null;
  contactKnown: boolean;
  posted: { id: string; title: string; status: string; priceMinor: number | null; createdAt: string }[];
  worked: { id: string; title: string; status: string; escrowMinor: number; assignmentStatus: string; createdAt: string }[];
  payouts: SettledPayout[];
  adjustments: { deltaMinor: number; reason: string; createdAt: string }[];
  reviews: { rating: number; comment: string | null; aboutRole: string; author: string; createdAt: string; taskId: string }[];
  /** Who deleted the account and why (null by = the person themselves). Null while it exists. */
  deletion: { at: string; by: string | null; reason: string | null } | null;
  /** What stops an admin deleting it right now (migration 087). Empty once deleted. */
  deletionBlockers: { code: string; message: string }[];
};

export async function getUser(id: string): Promise<UserDetail | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSessionClient();
  const { data: prof, error } = await supabase.from('profiles').select(`${PROFILE_COLS}, bio`).eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not read that person: ${error.message}`);
  if (!prof) return null;
  const p = prof as unknown as ProfileRow & { bio: string | null };

  const [roles, wallet, posted, worked, adjustments, reviews, payouts] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', id),
    supabase.from('wallets').select('balance_minor, clearing_minor').eq('user_id', id).maybeSingle(),
    supabase.from('tasks').select('id, title, status, locked_minor, benchmark_minor, created_at').eq('poster_id', id).order('created_at', { ascending: false }).limit(25),
    supabase.from('assignments').select('escrow_minor, status, created_at, tasks(id, title, status)').eq('worker_id', id).order('created_at', { ascending: false }).limit(25),
    supabase.from('wallet_adjustments').select('delta_minor, reason, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('reviews').select('rating, comment, about_role, author_id, created_at, task_id').eq('subject_id', id).order('created_at', { ascending: false }).limit(10),
    getSettledPayouts(null, 25, id),
  ]);

  let email: string | null = null;
  let phone: string | null = null;
  const service = serviceOrNull();
  if (service) {
    const { data } = await service.auth.admin.getUserById(id);
    email = data?.user?.email ?? null;
    phone = data?.user?.phone ?? null;
  }

  // account_deletions and its check function are newer than the generated types.
  let deletion: UserDetail['deletion'] = null;
  let deletionBlockers: UserDetail['deletionBlockers'] = [];
  if (p.deleted_at) {
    const { data } = await (supabase as unknown as SupabaseClient)
      .from('account_deletions')
      .select('deleted_at, deleted_by, reason')
      .eq('user_id', id)
      .maybeSingle();
    const d = data as { deleted_at: string; deleted_by: string | null; reason: string | null } | null;
    const by = d?.deleted_by ? (await namesFor([d.deleted_by])).get(d.deleted_by) ?? 'an admin' : null;
    deletion = { at: d?.deleted_at ?? p.deleted_at, by, reason: d?.reason ?? null };
  } else {
    const rpc = supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data, error: checkError } = await rpc('admin_account_deletion_check', { p_user: id });
    deletionBlockers = checkError
      ? [{ code: 'UNKNOWN', message: `Could not check: ${checkError.message}` }]
      : ((Array.isArray(data) ? data : []) as { code: string; message: string }[]);
  }

  const reviewRows = (reviews.data ?? []) as { rating: number; comment: string | null; about_role: string; author_id: string; created_at: string; task_id: string }[];
  const names = await namesFor(reviewRows.map((r) => r.author_id));
  const w = wallet.data as { balance_minor: number; clearing_minor: number } | null;
  type WorkedTask = { id: string; title: string; status: string };
  type Worked = { escrow_minor: number; status: string; created_at: string; tasks: WorkedTask | WorkedTask[] | null };

  return {
    ...toUserRow(p, w ? { b: Number(w.balance_minor), c: Number(w.clearing_minor) } : undefined, Date.now()),
    bio: p.bio,
    roles: ((roles.data ?? []) as { role: string }[]).map((r) => r.role),
    email,
    phone,
    contactKnown: Boolean(service),
    posted: ((posted.data ?? []) as { id: string; title: string; status: string; locked_minor: number | null; benchmark_minor: number; created_at: string }[]).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priceMinor: t.locked_minor != null ? Number(t.locked_minor) : Number(t.benchmark_minor) || null,
      createdAt: t.created_at,
    })),
    worked: ((worked.data ?? []) as unknown as Worked[]).flatMap((a) => {
      const t = one(a.tasks);
      return t ? [{ id: t.id, title: t.title, status: t.status, escrowMinor: Number(a.escrow_minor), assignmentStatus: a.status, createdAt: a.created_at }] : [];
    }),
    payouts,
    adjustments: ((adjustments.data ?? []) as { delta_minor: number; reason: string; created_at: string }[]).map((x) => ({
      deltaMinor: Number(x.delta_minor),
      reason: x.reason,
      createdAt: x.created_at,
    })),
    reviews: reviewRows.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      aboutRole: r.about_role,
      author: names.get(r.author_id) ?? 'Someone',
      createdAt: r.created_at,
      taskId: r.task_id,
    })),
    deletion,
    deletionBlockers,
  };
}

// ---------------------------------------------------------------- disputes --

export type DisputeRow = {
  taskId: string;
  title: string;
  posterId: string;
  poster: string;
  workerId: string | null;
  worker: string | null;
  escrowMinor: number;
  lockedMinor: number;
  /** Whether the poster actually paid. Unpaid jobs have nothing frozen. */
  funded: boolean;
  since: string;
  /** What the person who reported it said, when the report carried one. */
  reason: string | null;
  reasonBy: string | null;
};

export type DisputeReason = { reason: string; byId: string | null; by: string | null; at: string };

/**
 * Why each of these jobs was reported, newest report first per job (migration
 * 072). The table is newer than the generated types, so it is read untyped. A
 * failed read just leaves the reason out; it never blocks the decision.
 */
export async function getDisputeReasons(taskIds: string[]): Promise<Map<string, DisputeReason>> {
  const out = new Map<string, DisputeReason>();
  const ids = taskIds.filter(isUuid);
  if (ids.length === 0) return out;
  const supabase = (await createSessionClient()) as unknown as {
    from: (t: string) => {
      select: (c: string) => { in: (k: string, v: string[]) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }> } };
    };
  };
  const { data, error } = await supabase.from('task_disputes').select('task_id, reason, opened_by, created_at').in('task_id', ids).order('created_at', { ascending: false });
  if (error) return out;
  const rows = (data ?? []) as { task_id: string; reason: string; opened_by: string | null; created_at: string }[];
  const names = await namesFor(rows.map((r) => r.opened_by ?? ''));
  for (const r of rows) {
    if (out.has(r.task_id)) continue;
    out.set(r.task_id, { reason: r.reason, byId: r.opened_by, by: r.opened_by ? (names.get(r.opened_by) ?? null) : null, at: r.created_at });
  }
  return out;
}

export async function getDisputes(): Promise<DisputeRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, poster_id, locked_minor, updated_at, funded_at, assignments(worker_id, escrow_minor, created_at)')
    .eq('status', 'DISPUTED')
    .order('updated_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`Could not read disputes: ${error.message}`);
  type A = { worker_id: string; escrow_minor: number; created_at: string };
  type Row = { id: string; title: string; poster_id: string; locked_minor: number | null; updated_at: string; funded_at: string | null; assignments: A[] | A | null };
  const rows = (data ?? []) as unknown as Row[];
  const latest = (r: Row) =>
    (Array.isArray(r.assignments) ? [...r.assignments] : r.assignments ? [r.assignments] : []).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const [names, reasons] = await Promise.all([
    namesFor([...rows.map((r) => r.poster_id), ...rows.map((r) => latest(r)?.worker_id ?? '')]),
    getDisputeReasons(rows.map((r) => r.id)),
  ]);
  return rows.map((r) => {
    const a = latest(r);
    return {
      reason: reasons.get(r.id)?.reason ?? null,
      reasonBy: reasons.get(r.id)?.by ?? null,
      taskId: r.id,
      title: r.title,
      posterId: r.poster_id,
      poster: names.get(r.poster_id) ?? 'Poster',
      workerId: a?.worker_id ?? null,
      worker: a ? names.get(a.worker_id) ?? 'Worker' : null,
      escrowMinor: Number(a?.escrow_minor ?? 0),
      lockedMinor: Number(r.locked_minor ?? 0),
      funded: Boolean(r.funded_at),
      since: r.updated_at,
    };
  });
}

// -------------------------------------------------------------- promotions --

export type PromotionRow = {
  id: string;
  taskId: string;
  title: string;
  userId: string;
  user: string;
  amountMinor: number;
  days: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export async function getPromotions(limit = 100): Promise<PromotionRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('task_promotions')
    .select('id, task_id, user_id, amount_minor, days, status, starts_at, ends_at, created_at, tasks(title)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not read promotions: ${error.message}`);
  type Row = {
    id: string;
    task_id: string;
    user_id: string;
    amount_minor: number;
    days: number;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string;
    tasks: { title: string } | { title: string }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const names = await namesFor(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    id: r.id,
    taskId: r.task_id,
    title: one(r.tasks)?.title ?? 'Job',
    userId: r.user_id,
    user: names.get(r.user_id) ?? 'Someone',
    amountMinor: Number(r.amount_minor),
    days: r.days,
    status: r.status,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
  }));
}

// ----------------------------------------------------------------- support --

export type TicketRow = { id: string; subject: string; category: string; status: string; userId: string; user: string; createdAt: string; updatedAt: string };

export async function getTickets(status: 'waiting' | 'answered' | 'resolved' | 'all'): Promise<TicketRow[]> {
  const supabase = await createSessionClient();
  let q = supabase
    .from('support_tickets')
    .select('id, subject, category, status, user_id, created_at, updated_at')
    .order('updated_at', { ascending: status === 'waiting' })
    .limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(`Could not read help requests: ${error.message}`);
  const rows = (data ?? []) as { id: string; subject: string; category: string; status: string; user_id: string; created_at: string; updated_at: string }[];
  const names = await namesFor(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    category: r.category,
    status: r.status,
    userId: r.user_id,
    user: names.get(r.user_id) ?? 'Someone',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export type TicketDetail = TicketRow & { page: string | null; messages: { id: string; body: string; fromStaff: boolean; author: string; createdAt: string }[] };

export async function getTicket(id: string): Promise<TicketDetail | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSessionClient();
  const { data: t } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, user_id, page, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (!t) return null;
  const ticket = t as { id: string; subject: string; category: string; status: string; user_id: string; page: string | null; created_at: string; updated_at: string };
  // support_messages: id, ticket_id, sender_id, from_staff, body, created_at.
  // Read untyped in case the generated types predate the table.
  type Untyped = {
    from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => PromiseLike<{ data: unknown }> } } };
  };
  const { data: msgs } = await (supabase as unknown as Untyped)
    .from('support_messages')
    .select('id, sender_id, from_staff, body, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });
  const rows = (msgs ?? []) as { id: string; sender_id: string | null; from_staff: boolean; body: string; created_at: string }[];
  const names = await namesFor([ticket.user_id, ...rows.map((m) => m.sender_id ?? '')]);
  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    userId: ticket.user_id,
    user: names.get(ticket.user_id) ?? 'Someone',
    page: ticket.page,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    messages: rows.map((m) => ({
      id: m.id,
      body: m.body,
      fromStaff: Boolean(m.from_staff),
      author: m.from_staff ? 'TaskDrop support' : (m.sender_id && names.get(m.sender_id)) || names.get(ticket.user_id) || 'Them',
      createdAt: m.created_at,
    })),
  };
}

// -------------------------------------------------------------- nav counts --

export type NavCounts = { payouts: number; disputes: number; refunds: number; support: number };

/** The little numbers in the sidebar. Never throws: a missing count shows as nothing. */
export async function getNavCounts(): Promise<NavCounts> {
  const out: NavCounts = { payouts: 0, disputes: 0, refunds: 0, support: 0 };
  const supabase = await createSessionClient();
  await Promise.allSettled([
    (async () => {
      // Only withdrawals that need a person: paid by hand, held by RazorpayX
      // for balance or approval, or not with RazorpayX ten minutes after asking.
      const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
      const needsYou = await supabase
        .from('payouts')
        .select('id', { count: 'exact', head: true })
        .in('status', ['requested', 'processing'])
        .or(`via.eq.manual,provider_status.in.(queued,pending),and(provider_payout_id.is.null,created_at.lt.${tenMinAgo})`);
      if (!needsYou.error) {
        out.payouts = needsYou.count ?? 0;
        return;
      }
      // Before migration 066: every open withdrawal needed a person.
      const { count } = await supabase.from('payouts').select('id', { count: 'exact', head: true }).in('status', ['requested', 'processing']);
      out.payouts = count ?? 0;
    })(),
    (async () => {
      const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED');
      out.disputes = count ?? 0;
    })(),
    (async () => {
      const { count } = await supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'waiting');
      out.support = count ?? 0;
    })(),
    (async () => {
      const refunds = await getRefundsOwed();
      out.refunds = refunds?.length ?? 0;
    })(),
  ]);
  return out;
}
