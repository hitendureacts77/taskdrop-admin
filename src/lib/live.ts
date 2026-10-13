import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getNavCounts } from './data';
import type { LiveCounters, LiveEvent, LiveSnapshot } from './live-types';
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
export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  const [counters, events, nav] = await Promise.all([
    getLiveCounters().catch(() => null),
    getLiveEvents().catch(() => null),
    getNavCounts().catch(() => null),
  ]);
  return { counters, events, nav };
}
