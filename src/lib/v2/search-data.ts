import 'server-only';
import { namesFor } from '../data/people';
import { searchPlan } from '../data/search';
import { createClient as createSessionClient } from '../supabase/server';
import { isTestRow, isTestTitle, isTestUserId, notTestIdFilter } from '../test-data';

/**
 * Admin v2 global search (top-bar typeahead and the /search page): people,
 * jobs, payouts and help requests from one box. Read-only, with the staff
 * member's own session, so the database's row rules still apply. Payouts are
 * only read for a role that may see money (the caller decides). One group
 * failing never hides the others: it comes back empty with `failed` set.
 */

export type FoundPerson = { id: string; name: string; username: string | null; walletMinor: number | null; test: boolean };
export type FoundJob = { id: string; title: string; status: string; test: boolean };
export type FoundPayout = { id: string; userId: string; name: string; amountMinor: number; status: string; test: boolean };
export type FoundTicket = { id: string; subject: string; status: string; user: string; test: boolean };

export type Group<T> = { rows: T[]; total: number; failed: boolean };
export type SearchResults = {
  people: Group<FoundPerson>;
  jobs: Group<FoundJob>;
  payouts: Group<FoundPayout> | null;
  tickets: Group<FoundTicket>;
};

/** People matched by name are also looked up in payouts and help requests; this many at most. */
const PEOPLE_FOR_LINKS = 40;

const none = <T>(failed = false): Group<T> => ({ rows: [], total: 0, failed });

export async function searchEverything(q: string, opts: { limit: number; money: boolean; hide: boolean }): Promise<SearchResults> {
  const plan = searchPlan(q);
  const empty: SearchResults = { people: none(), jobs: none(), payouts: opts.money ? none() : null, tickets: none() };
  if (!plan.term && !plan.id && plan.amountMinor === null) return empty;
  const supabase = await createSessionClient();
  const limit = Math.max(1, Math.min(opts.limit, 20));

  // People first: their ids also find their payouts and help requests.
  const people = await (async (): Promise<Group<FoundPerson> & { ids: string[] }> => {
    const parts: string[] = [];
    if (plan.term) parts.push(`display_name.ilike.%${plan.term}%`, `username.ilike.%${plan.term}%`);
    if (plan.id) parts.push(`id.eq.${plan.id}`);
    if (!parts.length) return { ...none<FoundPerson>(), ids: [] };
    let pq = supabase.from('profiles').select('id, display_name, username', { count: 'exact' }).is('deleted_at', null).or(parts.join(','));
    if (opts.hide) pq = pq.or(notTestIdFilter('id'));
    const { data, error, count } = await pq.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PEOPLE_FOR_LINKS);
    if (error) return { ...none<FoundPerson>(true), ids: [] };
    const all = (data ?? []) as { id: string; display_name: string; username: string | null }[];
    const shown = all.slice(0, limit);
    const wallets = new Map<string, number>();
    if (opts.money && shown.length) {
      const { data: w } = await supabase.from('wallets').select('user_id, balance_minor').in('user_id', shown.map((p) => p.id));
      for (const r of (w ?? []) as { user_id: string; balance_minor: number }[]) wallets.set(r.user_id, Number(r.balance_minor));
    }
    return {
      rows: shown.map((p) => ({ id: p.id, name: p.display_name, username: p.username, walletMinor: opts.money ? (wallets.get(p.id) ?? 0) : null, test: isTestUserId(p.id) })),
      total: count ?? all.length,
      failed: false,
      ids: all.map((p) => p.id),
    };
  })();

  const jobs = (async (): Promise<Group<FoundJob>> => {
    const parts: string[] = [];
    if (plan.term) parts.push(`title.ilike.%${plan.term}%`);
    if (plan.id) parts.push(`id.eq.${plan.id}`);
    if (!parts.length) return none();
    let tq = supabase.from('tasks').select('id, title, status, poster_id', { count: 'exact' }).or(parts.join(','));
    if (opts.hide) tq = tq.or(notTestIdFilter('poster_id')).not('title', 'ilike', '[e2e]%');
    const { data, error, count } = await tq.order('updated_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
    if (error) return none(true);
    const rows = (data ?? []) as { id: string; title: string; status: string; poster_id: string }[];
    return { rows: rows.map((t) => ({ id: t.id, title: t.title, status: t.status, test: isTestRow({ posterId: t.poster_id, title: t.title }) })), total: count ?? rows.length, failed: false };
  })();

  const payouts = (async (): Promise<Group<FoundPayout> | null> => {
    if (!opts.money) return null;
    const parts: string[] = [];
    if (plan.id) parts.push(`id.eq.${plan.id}`, `user_id.eq.${plan.id}`);
    if (plan.amountMinor !== null) parts.push(`amount_minor.eq.${plan.amountMinor}`);
    if (people.ids.length) parts.push(`user_id.in.(${people.ids.join(',')})`);
    if (!parts.length) return none();
    let pq = supabase.from('payouts').select('id, user_id, amount_minor, status', { count: 'exact' }).or(parts.join(','));
    if (opts.hide) pq = pq.or(notTestIdFilter('user_id'));
    const { data, error, count } = await pq.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
    if (error) return none(true);
    const rows = (data ?? []) as { id: string; user_id: string; amount_minor: number; status: string }[];
    const names = await namesFor(rows.map((r) => r.user_id));
    return {
      rows: rows.map((r) => ({ id: r.id, userId: r.user_id, name: names.get(r.user_id) ?? 'Worker', amountMinor: Number(r.amount_minor), status: r.status, test: isTestUserId(r.user_id) })),
      total: count ?? rows.length,
      failed: false,
    };
  })();

  const tickets = (async (): Promise<Group<FoundTicket>> => {
    const parts: string[] = [];
    if (plan.term) parts.push(`subject.ilike.%${plan.term}%`);
    if (plan.id) parts.push(`id.eq.${plan.id}`, `user_id.eq.${plan.id}`);
    if (people.ids.length) parts.push(`user_id.in.(${people.ids.join(',')})`);
    if (!parts.length) return none();
    let sq = supabase.from('support_tickets').select('id, subject, status, user_id', { count: 'exact' }).or(parts.join(','));
    if (opts.hide) sq = sq.or(notTestIdFilter('user_id'));
    const { data, error, count } = await sq.order('updated_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
    if (error) return none(true);
    const rows = (data ?? []) as { id: string; subject: string; status: string; user_id: string }[];
    const names = await namesFor(rows.map((r) => r.user_id));
    return {
      rows: rows.map((r) => ({ id: r.id, subject: r.subject, status: r.status, user: names.get(r.user_id) ?? 'Someone', test: isTestUserId(r.user_id) || isTestTitle(r.subject) })),
      total: count ?? rows.length,
      failed: false,
    };
  })();

  const [j, p, t] = await Promise.all([jobs.catch(() => none<FoundJob>(true)), payouts.catch(() => (opts.money ? none<FoundPayout>(true) : null)), tickets.catch(() => none<FoundTicket>(true))]);
  const { ids: _ids, ...peopleGroup } = people;
  return { people: peopleGroup, jobs: j, payouts: p, tickets: t };
}
