import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { startOfIstDay } from '../days';
import { one } from './shared';

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
