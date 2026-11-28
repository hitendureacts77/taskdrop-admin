import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import { MONEY_ALERT_KINDS } from './alerts-text';
import { TEST_ID_HIGH, TEST_ID_LOW } from './test-data';

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

// ------------------------------------------------------------- admin v2 --

export type AdminAlertV2 = AdminAlert & { data: Record<string, unknown> | null };
export type AlertsReadV2 = { alerts: AdminAlertV2[]; unread: number; total: number | null; setup: boolean; error: string | null };

/** The same filters for the list and both counts: money kinds left out for Sales, fake-seed alerts left out when hiding test data. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scopeAlerts<Q extends { not: (...a: any[]) => Q; or: (f: string) => Q }>(q: Q, opts: { seesMoney: boolean; hideTest: boolean }): Q {
  let out = q;
  if (!opts.seesMoney) out = out.not('kind', 'in', `(${MONEY_ALERT_KINDS.join(',')})`);
  if (opts.hideTest) {
    for (const key of ['poster', 'worker']) out = out.or(`data->>${key}.is.null,data->>${key}.lt.${TEST_ID_LOW},data->>${key}.gt.${TEST_ID_HIGH}`);
    out = out.not('title', 'ilike', '[e2e]%');
  }
  return out;
}

/** Alerts for the v2 page, with the stored `data` (ids the links are built from). Callers must call requireAdmin() first. */
export async function getAdminAlertsV2(view: 'unread' | 'all', opts: { seesMoney: boolean; hideTest: boolean }): Promise<AlertsReadV2> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  let q = scopeAlerts(supabase.from('admin_alerts').select('id, kind, title, body, data, created_at, read_at'), opts);
  if (view === 'unread') q = q.is('read_at', null);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(100);
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { alerts: [], unread: 0, total: null, setup, error: setup ? null : error.message };
  }
  type R = { id: string; kind: string; title: string; body: string | null; data: unknown; created_at: string; read_at: string | null };
  const alerts = ((data ?? []) as R[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    data: r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : null,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));
  const [unread, total] = await Promise.all([
    scopeAlerts(supabase.from('admin_alerts').select('id', { count: 'exact', head: true }), opts).is('read_at', null),
    scopeAlerts(supabase.from('admin_alerts').select('id', { count: 'exact', head: true }), opts),
  ]);
  return { alerts, unread: unread.count ?? alerts.filter((a) => !a.readAt).length, total: total.count ?? null, setup: false, error: null };
}
