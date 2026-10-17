import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { addIstDays, istDayKey, istFormat, startOfIstDay } from '../days';
import { namesFor } from './people';
import { isUuid } from './tasks';

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
