import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getNavCounts } from './data';
import { getNeedsYou } from './needs-you-data';
import type { LiveCounters, LiveEvent, LiveSnapshot } from './live-types';
import { liveEventIsMoney, staffCanSee, type StaffRole } from './staff-roles';
import { createClient as createSessionClient } from './supabase/server';

/**
 * Server reads for the live parts of the panel (migration 091 in the TaskDrop
 * app repo). Both go through the signed-in admin's session, so RLS and
 * admin_live_counters()'s own admin check decide what comes back; nothing
 * here uses the service key.
 *
 * Both return null rather than throwing when 091 isn't applied yet, so the
 * panel keeps working and simply shows no live strip or feed.
 */

// Newer than the generated types (migration 091).
const untyped = (c: unknown) => c as SupabaseClient;

export async function getLiveCounters(): Promise<LiveCounters | null> {
  const supabase = untyped(await createSessionClient());
  const { data, error } = await supabase.rpc('admin_live_counters');
  if (error || !data) return null;
  return data as LiveCounters;
}

export async function getLiveEvents(limit = 40): Promise<LiveEvent[] | null> {
  const supabase = untyped(await createSessionClient());
  const { data, error } = await supabase
    .from('admin_live_events')
    .select('id, kind, record_type, record_id, actor_id, summary, created_at')
    .order('id', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) return null;
  return (data ?? []) as LiveEvent[];
}

/** Everything the live parts of the panel need, in one round trip. */
export async function getLiveSnapshot(role: StaffRole = 'admin'): Promise<LiveSnapshot> {
  const [counters, events, nav, needs] = await Promise.all([
    getLiveCounters().catch(() => null),
    getLiveEvents().catch(() => null),
    getNavCounts().catch(() => null),
    getNeedsYou(role).catch(() => null),
  ]);
  if (staffCanSee(role, 'money')) return { counters, events, nav, needs };
  // A role that cannot see money gets no withdrawals, payouts, wallet changes or disputes, not even as counts.
  return {
    counters: counters ? { ...counters, disputes_open: 0 } : counters,
    events: events ? events.filter((e) => !liveEventIsMoney(e.kind, e.summary)) : events,
    nav: nav ? { ...nav, payouts: 0, disputes: 0, refunds: 0 } : nav,
    needs,
  };
}
