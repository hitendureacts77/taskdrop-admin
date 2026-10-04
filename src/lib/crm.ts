import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from './supabase/server';
import { createClient as createServiceClient } from './supabase/service';
import { isUuid, namesFor } from './data';

/**
 * Reads for the CRM screens: notes, tags, suspensions, segments and messages.
 *
 * The CRM tables are newer than the generated database types, so they are read
 * through an untyped client. Every table here can only be read by a signed-in
 * admin (row-level security), and every page that calls these checks
 * requireAdmin() first; writes go through the database functions in
 * lib/crm-actions.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, 'public', any>;
async function db(): Promise<Db> {
  return (await createSessionClient()) as unknown as Db;
}

// ----------------------------------------------------------------- criteria --

export type Criteria = {
  role?: 'any' | 'worker' | 'poster';
  joined_within_days?: number;
  inactive_days?: number;
  tag_id?: string;
  min_wallet_minor?: number;
  never_posted?: boolean;
  available_now?: boolean;
  include_suspended?: boolean;
};

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const wholeNumber = (v: string | undefined, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : undefined;
};

/** Filters live in the page address, so a view can be bookmarked, shared or turned into a message. */
export function parseCriteria(sp: SP): Criteria {
  const c: Criteria = {};
  const role = first(sp.role);
  if (role === 'worker' || role === 'poster') c.role = role;
  const joined = wholeNumber(first(sp.joined), 3650);
  if (joined) c.joined_within_days = joined;
  const inactive = wholeNumber(first(sp.inactive), 3650);
  if (inactive) c.inactive_days = inactive;
  const tag = first(sp.tag);
  if (tag && isUuid(tag)) c.tag_id = tag;
  const rupees = Number(first(sp.minwallet));
  if (Number.isFinite(rupees) && rupees > 0) c.min_wallet_minor = Math.round(Math.min(rupees, 1e7) * 100);
  if (first(sp.never_posted) === '1') c.never_posted = true;
  if (first(sp.live) === '1') c.available_now = true;
  if (first(sp.suspended) === '1') c.include_suspended = true;
  return c;
}

export function criteriaToQuery(c: Criteria): string {
  const p = new URLSearchParams();
  if (c.role && c.role !== 'any') p.set('role', c.role);
  if (c.joined_within_days) p.set('joined', String(c.joined_within_days));
  if (c.inactive_days) p.set('inactive', String(c.inactive_days));
  if (c.tag_id) p.set('tag', c.tag_id);
  if (c.min_wallet_minor) p.set('minwallet', String(c.min_wallet_minor / 100));
  if (c.never_posted) p.set('never_posted', '1');
  if (c.available_now) p.set('live', '1');
  if (c.include_suspended) p.set('suspended', '1');
  return p.toString();
}

export function describeCriteria(c: Criteria, tags: Tag[]): string {
  const parts: string[] = [];
  parts.push(c.role === 'worker' ? 'Workers' : c.role === 'poster' ? 'People who only post' : 'Everyone');
  if (c.joined_within_days) parts.push(`joined in the last ${c.joined_within_days} day${c.joined_within_days === 1 ? '' : 's'}`);
  if (c.inactive_days) parts.push(`not seen for ${c.inactive_days}+ days`);
  if (c.tag_id) parts.push(`tagged “${tags.find((t) => t.id === c.tag_id)?.name ?? 'a deleted tag'}”`);
  if (c.min_wallet_minor) parts.push(`₹${(c.min_wallet_minor / 100).toLocaleString('en-IN')}+ in their wallet`);
  if (c.never_posted) parts.push('never posted a job');
  if (c.available_now) parts.push('available now');
  if (c.include_suspended) parts.push('including suspended');
  return parts.join(' · ');
}

export const hasFilters = (c: Criteria) => Object.keys(c).length > 0;

// -------------------------------------------------------------------- tags --

export type Tag = { id: string; name: string; color: string };
export type TagWithCount = Tag & { people: number };

export async function getTags(): Promise<TagWithCount[]> {
  const supabase = await db();
  const [tags, links] = await Promise.all([
    supabase.from('crm_tags').select('id, name, color').order('name'),
    supabase.from('crm_user_tags').select('tag_id').limit(20000),
  ]);
  if (tags.error) throw new Error(`Could not read tags: ${tags.error.message}`);
  const counts = new Map<string, number>();
  for (const l of (links.data ?? []) as { tag_id: string }[]) counts.set(l.tag_id, (counts.get(l.tag_id) ?? 0) + 1);
  return ((tags.data ?? []) as Tag[]).map((t) => ({ ...t, people: counts.get(t.id) ?? 0 }));
}

export async function getTagsFor(ids: string[]): Promise<Map<string, Tag[]>> {
  const out = new Map<string, Tag[]>();
  if (!ids.length) return out;
  const supabase = await db();
  const { data } = await supabase.from('crm_user_tags').select('user_id, crm_tags(id, name, color)').in('user_id', ids);
  for (const r of (data ?? []) as unknown as { user_id: string; crm_tags: Tag | Tag[] | null }[]) {
    const t = Array.isArray(r.crm_tags) ? r.crm_tags[0] : r.crm_tags;
    if (!t) continue;
    out.set(r.user_id, [...(out.get(r.user_id) ?? []), t]);
  }
  return out;
}

/** Which of these people are suspended right now, and why. */
export async function getSuspendedAmong(ids: string[]): Promise<Map<string, { reason: string; at: string }>> {
  const out = new Map<string, { reason: string; at: string }>();
  if (!ids.length) return out;
  const supabase = await db();
  const { data } = await supabase.from('user_suspensions').select('user_id, reason, suspended_at').in('user_id', ids).is('lifted_at', null);
  for (const r of (data ?? []) as { user_id: string; reason: string; suspended_at: string }[]) out.set(r.user_id, { reason: r.reason, at: r.suspended_at });
  return out;
}

/** People who carry a tag, or are suspended: the lists behind the People filters. */
export async function idsWithTag(tagId: string): Promise<string[]> {
  if (!isUuid(tagId)) return [];
  const supabase = await db();
  const { data } = await supabase.from('crm_user_tags').select('user_id').eq('tag_id', tagId).limit(20000);
  return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
}

export async function idsSuspended(): Promise<string[]> {
  const supabase = await db();
  const { data } = await supabase.from('user_suspensions').select('user_id').is('lifted_at', null).limit(20000);
  return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
}

// ------------------------------------------------------------- one person --

export type Note = { id: string; body: string; pinned: boolean; followUpAt: string | null; doneAt: string | null; author: string; createdAt: string };
export type Suspension = { id: string; reason: string; by: string; at: string; liftedAt: string | null; liftedBy: string | null; liftNote: string | null };
export type SentMessage = { id: string; title: string; body: string; at: string; by: string };

export type PersonCrm = {
  tags: Tag[];
  allTags: Tag[];
  notes: Note[];
  suspension: Suspension | null;
  suspensionHistory: Suspension[];
  messages: SentMessage[];
};

export async function getPersonCrm(userId: string): Promise<PersonCrm> {
  const supabase = await db();
  const [tags, allTags, notes, susp, msgs] = await Promise.all([
    getTagsFor([userId]),
    getTags(),
    supabase.from('crm_notes').select('id, body, pinned, follow_up_at, done_at, author_id, created_at').eq('user_id', userId).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(100),
    supabase.from('user_suspensions').select('id, reason, suspended_by, suspended_at, lifted_at, lifted_by, lift_note').eq('user_id', userId).order('suspended_at', { ascending: false }).limit(20),
    supabase.from('crm_broadcasts').select('id, title, body, sent_at, sent_by').eq('to_user', userId).order('sent_at', { ascending: false }).limit(20),
  ]);
  const noteRows = (notes.data ?? []) as { id: string; body: string; pinned: boolean; follow_up_at: string | null; done_at: string | null; author_id: string | null; created_at: string }[];
  const suspRows = (susp.data ?? []) as { id: string; reason: string; suspended_by: string | null; suspended_at: string; lifted_at: string | null; lifted_by: string | null; lift_note: string | null }[];
  const msgRows = (msgs.data ?? []) as { id: string; title: string; body: string; sent_at: string; sent_by: string | null }[];
  const names = await namesFor([
    ...noteRows.map((n) => n.author_id ?? ''),
    ...suspRows.flatMap((s) => [s.suspended_by ?? '', s.lifted_by ?? '']),
    ...msgRows.map((m) => m.sent_by ?? ''),
  ]);
  const who = (id: string | null) => (id ? names.get(id) ?? 'An admin' : 'An admin');
  const history = suspRows.map((s) => ({ id: s.id, reason: s.reason, by: who(s.suspended_by), at: s.suspended_at, liftedAt: s.lifted_at, liftedBy: s.lifted_by ? who(s.lifted_by) : null, liftNote: s.lift_note }));
  return {
    tags: tags.get(userId) ?? [],
    allTags,
    notes: noteRows.map((n) => ({ id: n.id, body: n.body, pinned: n.pinned, followUpAt: n.follow_up_at, doneAt: n.done_at, author: who(n.author_id), createdAt: n.created_at })),
    suspension: history.find((h) => !h.liftedAt) ?? null,
    suspensionHistory: history.filter((h) => h.liftedAt),
    messages: msgRows.map((m) => ({ id: m.id, title: m.title, body: m.body, at: m.sent_at, by: who(m.sent_by) })),
  };
}

// --------------------------------------------------------------- timeline --

export type TimelineEvent = { at: string; label: string; detail?: string; href?: string; tone: 'blue' | 'green' | 'gold' | 'red' | 'grey' };

/** Everything that has happened to a person, newest first, from the records already in the database. */
export async function getTimeline(userId: string, joinedAt: string): Promise<TimelineEvent[]> {
  const supabase = await db();
  const [posted, worked, reviews, payouts, tickets, notes, susp, msgs] = await Promise.all([
    supabase.from('tasks').select('id, title, status, created_at').eq('poster_id', userId).order('created_at', { ascending: false }).limit(15),
    supabase.from('assignments').select('created_at, tasks(id, title)').eq('worker_id', userId).order('created_at', { ascending: false }).limit(15),
    supabase.from('reviews').select('rating, about_role, created_at, task_id').eq('subject_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('payouts').select('id, amount_minor, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('support_tickets').select('id, subject, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('crm_notes').select('body, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('user_suspensions').select('reason, suspended_at, lifted_at').eq('user_id', userId).order('suspended_at', { ascending: false }).limit(10),
    supabase.from('crm_broadcasts').select('id, title, sent_at').eq('to_user', userId).order('sent_at', { ascending: false }).limit(10),
  ]);
  const ev: TimelineEvent[] = [{ at: joinedAt, label: 'Joined TaskDrop', tone: 'green' }];
  const inr = (m: number) => `₹${(m / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  for (const t of (posted.data ?? []) as { id: string; title: string; created_at: string }[]) ev.push({ at: t.created_at, label: 'Posted a job', detail: t.title, href: `/tasks/${t.id}`, tone: 'blue' });
  type W = { created_at: string; tasks: { id: string; title: string } | { id: string; title: string }[] | null };
  for (const a of (worked.data ?? []) as unknown as W[]) {
    const t = Array.isArray(a.tasks) ? a.tasks[0] : a.tasks;
    if (t) ev.push({ at: a.created_at, label: 'Was hired for a job', detail: t.title, href: `/tasks/${t.id}`, tone: 'blue' });
  }
  for (const r of (reviews.data ?? []) as { rating: number; about_role: string; created_at: string; task_id: string }[]) {
    ev.push({ at: r.created_at, label: `Got a ${r.rating}★ review as a ${r.about_role}`, href: `/tasks/${r.task_id}`, tone: r.rating >= 4 ? 'green' : r.rating <= 2 ? 'red' : 'grey' });
  }
  for (const p of (payouts.data ?? []) as { amount_minor: number; status: string; created_at: string }[]) {
    ev.push({ at: p.created_at, label: `Asked to withdraw ${inr(Number(p.amount_minor))}`, detail: p.status, tone: 'gold' });
  }
  for (const t of (tickets.data ?? []) as { id: string; subject: string; created_at: string }[]) ev.push({ at: t.created_at, label: 'Asked for help', detail: t.subject, href: `/support/${t.id}`, tone: 'gold' });
  for (const n of (notes.data ?? []) as { body: string; created_at: string }[]) ev.push({ at: n.created_at, label: 'Admin note added', detail: n.body.length > 90 ? `${n.body.slice(0, 90)}…` : n.body, tone: 'grey' });
  for (const s of (susp.data ?? []) as { reason: string; suspended_at: string; lifted_at: string | null }[]) {
    ev.push({ at: s.suspended_at, label: 'Suspended', detail: s.reason, tone: 'red' });
    if (s.lifted_at) ev.push({ at: s.lifted_at, label: 'Suspension lifted', tone: 'green' });
  }
  for (const m of (msgs.data ?? []) as { id: string; title: string; sent_at: string }[]) ev.push({ at: m.sent_at, label: 'Sent a message', detail: m.title, tone: 'blue' });
  return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}

// ---------------------------------------------------------------- segments --

export type MemberRow = {
  id: string;
  name: string;
  isWorker: boolean;
  place: string | null;
  joinedAt: string;
  lastSeenAt: string | null;
  walletMinor: number;
  clearingMinor: number;
  tags: Tag[];
  suspended: boolean;
};

async function matchingIds(c: Criteria): Promise<string[]> {
  const supabase = await db();
  const { data, error } = await supabase.rpc('crm_segment_users', { p_criteria: c });
  if (error) throw new Error(`Could not work out who matches: ${error.message}`);
  return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
}

export async function countMatching(c: Criteria): Promise<number> {
  return (await matchingIds(c)).length;
}

async function memberRows(ids: string[]): Promise<MemberRow[]> {
  if (!ids.length) return [];
  const supabase = await db();
  const [profiles, wallets, tags, susp] = await Promise.all([
    supabase.from('profiles').select('id, display_name, loc_label, created_at, last_seen_at, worker_onboarded_at').in('id', ids),
    supabase.from('wallets').select('user_id, balance_minor, clearing_minor').in('user_id', ids),
    getTagsFor(ids),
    getSuspendedAmong(ids),
  ]);
  const w = new Map(((wallets.data ?? []) as { user_id: string; balance_minor: number; clearing_minor: number }[]).map((x) => [x.user_id, x]));
  const rows = ((profiles.data ?? []) as { id: string; display_name: string; loc_label: string | null; created_at: string; last_seen_at: string | null; worker_onboarded_at: string | null }[]).map((p) => ({
    id: p.id,
    name: p.display_name,
    isWorker: Boolean(p.worker_onboarded_at),
    place: p.loc_label,
    joinedAt: p.created_at,
    lastSeenAt: p.last_seen_at,
    walletMinor: Number(w.get(p.id)?.balance_minor ?? 0),
    clearingMinor: Number(w.get(p.id)?.clearing_minor ?? 0),
    tags: tags.get(p.id) ?? [],
    suspended: susp.has(p.id),
  }));
  return rows.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
}

export async function getMembers(c: Criteria, page: number, pageSize = 30): Promise<{ rows: MemberRow[]; total: number }> {
  const ids = await matchingIds(c);
  const names = await namesFor(ids);
  const sorted = [...ids].sort((a, b) => (names.get(a) ?? '').localeCompare(names.get(b) ?? ''));
  return { total: ids.length, rows: await memberRows(sorted.slice(page * pageSize, (page + 1) * pageSize)) };
}

export type Segment = { id: string; name: string; criteria: Criteria; description: string; people: number; createdAt: string };

export async function getSegments(tags: Tag[]): Promise<Segment[]> {
  const supabase = await db();
  const { data, error } = await supabase.from('crm_segments').select('id, name, criteria, created_at').order('created_at', { ascending: false });
  if (error) throw new Error(`Could not read segments: ${error.message}`);
  const rows = (data ?? []) as { id: string; name: string; criteria: Criteria; created_at: string }[];
  return Promise.all(
    rows.map(async (r) => ({ id: r.id, name: r.name, criteria: r.criteria, description: describeCriteria(r.criteria, tags), people: await countMatching(r.criteria).catch(() => 0), createdAt: r.created_at })),
  );
}

// ------------------------------------------------------------------ hub --

export type FollowUp = { id: string; userId: string; person: string; body: string; dueAt: string; overdue: boolean };

export async function getFollowUps(limit = 50): Promise<FollowUp[]> {
  const supabase = await db();
  const { data } = await supabase.from('crm_notes').select('id, user_id, body, follow_up_at').not('follow_up_at', 'is', null).is('done_at', null).order('follow_up_at', { ascending: true }).limit(limit);
  const rows = (data ?? []) as { id: string; user_id: string; body: string; follow_up_at: string }[];
  const names = await namesFor(rows.map((r) => r.user_id));
  const now = Date.now();
  return rows.map((r) => ({ id: r.id, userId: r.user_id, person: names.get(r.user_id) ?? 'Someone', body: r.body, dueAt: r.follow_up_at, overdue: new Date(r.follow_up_at).getTime() <= now }));
}

export type Broadcast = { id: string; title: string; body: string; audience: string; recipients: number; at: string; by: string; toUser: string | null };

export async function getBroadcasts(limit = 30): Promise<Broadcast[]> {
  const supabase = await db();
  const { data, error } = await supabase.from('crm_broadcasts').select('id, title, body, audience, recipients, sent_at, sent_by, to_user').order('sent_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Could not read messages: ${error.message}`);
  const rows = (data ?? []) as { id: string; title: string; body: string; audience: string; recipients: number; sent_at: string; sent_by: string | null; to_user: string | null }[];
  const names = await namesFor(rows.flatMap((r) => [r.sent_by ?? '', r.to_user ?? '']));
  return rows.map((r) => ({ id: r.id, title: r.title, body: r.body, audience: r.to_user ? `Just ${names.get(r.to_user) ?? 'one person'}` : r.audience, recipients: r.recipients, at: r.sent_at, by: r.sent_by ? names.get(r.sent_by) ?? 'An admin' : 'An admin', toUser: r.to_user }));
}

export type CrmOverview = {
  people: number;
  suspended: { id: string; name: string; reason: string; at: string }[];
  tags: TagWithCount[];
  followUps: FollowUp[];
  notes: { id: string; userId: string; person: string; body: string; at: string }[];
  broadcasts: Broadcast[];
  broadcastsTotal: number;
  notesTotal: number;
};

export async function getCrmOverview(): Promise<CrmOverview> {
  const supabase = await db();
  const [people, susp, tags, followUps, notes, notesCount, broadcasts, bcount] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('user_suspensions').select('user_id, reason, suspended_at').is('lifted_at', null).order('suspended_at', { ascending: false }).limit(20),
    getTags(),
    getFollowUps(30),
    supabase.from('crm_notes').select('id, user_id, body, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('crm_notes').select('id', { count: 'exact', head: true }),
    getBroadcasts(5),
    supabase.from('crm_broadcasts').select('id', { count: 'exact', head: true }),
  ]);
  const suspRows = (susp.data ?? []) as { user_id: string; reason: string; suspended_at: string }[];
  const noteRows = (notes.data ?? []) as { id: string; user_id: string; body: string; created_at: string }[];
  const names = await namesFor([...suspRows.map((s) => s.user_id), ...noteRows.map((n) => n.user_id)]);
  return {
    people: people.count ?? 0,
    suspended: suspRows.map((s) => ({ id: s.user_id, name: names.get(s.user_id) ?? 'Someone', reason: s.reason, at: s.suspended_at })),
    tags,
    followUps,
    notes: noteRows.map((n) => ({ id: n.id, userId: n.user_id, person: names.get(n.user_id) ?? 'Someone', body: n.body, at: n.created_at })),
    broadcasts,
    broadcastsTotal: bcount.count ?? 0,
    notesTotal: notesCount.count ?? 0,
  };
}

// ----------------------------------------------------------------- audience --

export type Audience = { key: string; label: string; group: string; count: number };

/** The audiences a message can go to, each with how many people it would reach today. */
export async function getAudiences(extra?: Criteria): Promise<Audience[]> {
  const tags = await getTags();
  const segments = await getSegments(tags);
  const [everyone, workers, posters] = await Promise.all([countMatching({}), countMatching({ role: 'worker' }), countMatching({ role: 'poster' })]);
  const out: Audience[] = [];
  if (extra && hasFilters(extra)) out.push({ key: 'filters', label: `Your filters: ${describeCriteria(extra, tags)}`, group: 'From the Segments page', count: await countMatching(extra) });
  out.push({ key: 'all', label: 'Everyone', group: 'Everyone', count: everyone }, { key: 'workers', label: 'All workers', group: 'Everyone', count: workers }, { key: 'posters', label: 'People who only post', group: 'Everyone', count: posters });
  for (const s of segments) out.push({ key: `segment:${s.id}`, label: s.name, group: 'Saved segments', count: s.people });
  for (const t of tags) out.push({ key: `tag:${t.id}`, label: t.name, group: 'Tags', count: t.people });
  return out;
}

// ------------------------------------------------------------------- export --

const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  // A spreadsheet runs a cell that starts with = + - @ as a formula; defuse it.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A spreadsheet of the people in a view. Phone and email are included only when the server holds the service key. */
export async function exportCsv(ids: string[]): Promise<string> {
  const rows: MemberRow[] = [];
  for (let i = 0; i < ids.length; i += 200) rows.push(...(await memberRows(ids.slice(i, i + 200))));
  let service: ReturnType<typeof createServiceClient> | null = null;
  try {
    service = createServiceClient();
  } catch {
    service = null;
  }
  const head = ['Name', 'Does', 'Place', 'Joined', 'Last seen', 'Wallet ₹', 'Clearing ₹', 'Tags', 'Suspended', ...(service ? ['Email', 'Phone'] : []), 'Person id'];
  const lines = [head.map(csvCell).join(',')];
  for (const r of rows) {
    let email = '';
    let phone = '';
    if (service) {
      const { data } = await service.auth.admin.getUserById(r.id);
      email = data?.user?.email ?? '';
      phone = data?.user?.phone ?? '';
    }
    lines.push(
      [r.name, r.isWorker ? 'Worker' : 'Poster', r.place ?? '', r.joinedAt.slice(0, 10), r.lastSeenAt?.slice(0, 10) ?? '', (r.walletMinor / 100).toFixed(2), (r.clearingMinor / 100).toFixed(2), r.tags.map((t) => t.name).join('; '), r.suspended ? 'Yes' : 'No', ...(service ? [email, phone] : []), r.id]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

export async function idsForCriteria(c: Criteria): Promise<string[]> {
  return matchingIds(c);
}
