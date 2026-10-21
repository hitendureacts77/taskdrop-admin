import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from './supabase/server';

/**
 * Messages the background jobs leave for the team (migration 090): a withdrawal
 * waiting, a payout that failed, a help request, the daily digest. Callers must
 * call requireAdmin() first; row level security lets only admins read them.
 * Says plainly when the table is not there yet instead of failing the page.
 */

export type AdminAlert = { id: string; kind: string; title: string; body: string | null; createdAt: string; readAt: string | null };

export type AlertsRead = { alerts: AdminAlert[]; unread: number; setup: boolean; error: string | null };

const NOT_THERE = /does not exist|could not find the table|schema cache|PGRST20[24]|42P01/i;

export async function getAdminAlerts(view: 'unread' | 'all'): Promise<AlertsRead> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  let q = supabase.from('admin_alerts').select('id, kind, title, body, created_at, read_at').order('created_at', { ascending: false }).limit(100);
  if (view === 'unread') q = q.is('read_at', null);
  const { data, error } = await q;
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { alerts: [], unread: 0, setup, error: setup ? null : error.message };
  }
  const alerts = ((data ?? []) as { id: string; kind: string; title: string; body: string | null; created_at: string; read_at: string | null }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));
  const { count } = await supabase.from('admin_alerts').select('id', { count: 'exact', head: true }).is('read_at', null);
  return { alerts, unread: count ?? alerts.filter((a) => !a.readAt).length, setup: false, error: null };
}
