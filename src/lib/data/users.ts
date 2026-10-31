import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from '../supabase/server';
import { startOfIstDay } from '../days';
import { serviceOrNull, cleanSearch, one } from './shared';
import { type SettledPayout, getSettledPayouts } from './payouts';
import { namesFor } from './people';
import { isUuid } from './tasks';

// ------------------------------------------------------------------- users --

export const USER_FILTERS = [
  { key: 'all', label: 'Everyone' },
  { key: 'new_today', label: 'Joined today' },
  { key: 'online', label: 'Online now' },
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
  // Same window as the app's "Active now" (apps/mobile/src/lib/presence.ts).
  if (filter === 'online') q = q.gt('last_seen_at', new Date(Date.now() - 3 * 60_000).toISOString()).is('deleted_at', null);
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

  // Bound: a bare reference to supabase.rpc loses the client it belongs to.
  const rpc = (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>).bind(supabase);
  const service = serviceOrNull();
  // Everything below needs only the id (and whether the account is deleted), so it is all read together.
  const [roles, wallet, posted, worked, adjustments, reviews, payouts, auth, deletionRead, blockersRead] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', id),
    supabase.from('wallets').select('balance_minor, clearing_minor').eq('user_id', id).maybeSingle(),
    supabase.from('tasks').select('id, title, status, locked_minor, benchmark_minor, created_at').eq('poster_id', id).order('created_at', { ascending: false }).limit(25),
    supabase.from('assignments').select('escrow_minor, status, created_at, tasks(id, title, status)').eq('worker_id', id).order('created_at', { ascending: false }).limit(25),
    supabase.from('wallet_adjustments').select('delta_minor, reason, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('reviews').select('rating, comment, about_role, author_id, created_at, task_id').eq('subject_id', id).order('created_at', { ascending: false }).limit(10),
    getSettledPayouts(null, 25, id),
    service ? service.auth.admin.getUserById(id) : null,
    // account_deletions and its check function are newer than the generated types.
    p.deleted_at ? (supabase as unknown as SupabaseClient).from('account_deletions').select('deleted_at, deleted_by, reason').eq('user_id', id).maybeSingle() : null,
    p.deleted_at ? null : rpc('admin_account_deletion_check', { p_user: id }),
  ]);

  const email = auth?.data?.user?.email ?? null;
  const phone = auth?.data?.user?.phone ?? null;

  let deletion: UserDetail['deletion'] = null;
  let deletionBlockers: UserDetail['deletionBlockers'] = [];
  if (deletionRead) {
    const d = deletionRead.data as { deleted_at: string; deleted_by: string | null; reason: string | null } | null;
    const by = d?.deleted_by ? (await namesFor([d.deleted_by])).get(d.deleted_by) ?? 'an admin' : null;
    deletion = { at: d?.deleted_at ?? p.deleted_at!, by, reason: d?.reason ?? null };
  } else if (blockersRead) {
    const { data, error: checkError } = blockersRead;
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
