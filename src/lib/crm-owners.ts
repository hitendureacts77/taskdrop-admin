import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { matchesOwner, type OwnerFilter } from './crm-calc';
import { namesFor } from './data';
import { createClient } from './supabase/server';

/**
 * Which member of staff looks after which customer (crm_owners). Reads only;
 * the change goes through crm_assign_owner in lib/crm-actions.ts. Callers must
 * call requireAdmin() first.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, 'public', any>;
async function db(): Promise<Db> {
  return (await createClient()) as unknown as Db;
}

export type OwnerRef = { id: string; name: string };

/** The owner of each of these people, for the ones that have one. */
export async function getOwnerMap(ids: string[]): Promise<Map<string, OwnerRef>> {
  const out = new Map<string, OwnerRef>();
  if (!ids.length) return out;
  const supabase = await db();
  const { data } = await supabase.from('crm_owners').select('user_id, owner_id').in('user_id', ids);
  const rows = (data ?? []) as { user_id: string; owner_id: string }[];
  const names = await namesFor(rows.map((r) => r.owner_id));
  for (const r of rows) out.set(r.user_id, { id: r.owner_id, name: names.get(r.owner_id) ?? 'An admin' });
  return out;
}

/** Keep only the people whose owner passes the filter ('anyone' keeps everyone). */
export async function applyOwnerFilter(ids: string[], filter: OwnerFilter, meId: string): Promise<string[]> {
  if (filter === 'anyone' || !ids.length) return ids;
  const supabase = await db();
  const owned = new Map<string, string>();
  if (filter === 'nobody') {
    const { data } = await supabase.from('crm_owners').select('user_id, owner_id').limit(50000);
    for (const r of (data ?? []) as { user_id: string; owner_id: string }[]) owned.set(r.user_id, r.owner_id);
  } else {
    const who = filter === 'me' ? meId : filter;
    const { data } = await supabase.from('crm_owners').select('user_id, owner_id').eq('owner_id', who).limit(50000);
    for (const r of (data ?? []) as { user_id: string; owner_id: string }[]) owned.set(r.user_id, r.owner_id);
  }
  return ids.filter((id) => matchesOwner(owned.get(id) ?? null, filter, meId));
}
