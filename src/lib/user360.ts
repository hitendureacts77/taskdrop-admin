import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid } from './data';
import { createClient as createServiceClient } from './supabase/service';
import { createClient as createSessionClient } from './supabase/server';

/**
 * Extra reads for the Money, Devices and Audit tabs on a person's page. Callers
 * must call requireAdmin() first (the page does). Payments and push tokens are
 * own-rows-only under RLS, so they are read with the service key, read-only,
 * like refunds_outstanding in data.ts; with no key the tab says so.
 */

export type UserPayment = {
  id: string;
  taskId: string | null;
  purpose: string;
  status: string;
  amountMinor: number;
  paidAt: string | null;
  createdAt: string;
};

export type UserDevice = { platform: string; registeredAt: string; lastSeenAt: string; appVersion?: string | null; osVersion?: string | null };

export type UserAuditEntry = { id: number; at: string; actor: string; action: string; table: string | null; detail: string | null };

function serviceOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

/** This person's own payments (funding a job, topping up), newest first. Null when the server has no service key. */
export async function getUserPayments(userId: string): Promise<UserPayment[] | null> {
  if (!isUuid(userId)) return [];
  const service = serviceOrNull();
  if (!service) return null;
  const { data, error } = await service
    .from('payments')
    .select('id, task_id, purpose, status, amount_minor, paid_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`Could not read their payments: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    taskId: p.task_id,
    purpose: p.purpose,
    status: p.status,
    amountMinor: Number(p.amount_minor),
    paidAt: p.paid_at,
    createdAt: p.created_at,
  }));
}

/** Phones and browsers that can receive this person's notifications. The token itself is never returned. Null without a service key. */
export async function getUserDevices(userId: string): Promise<UserDevice[] | null> {
  if (!isUuid(userId)) return [];
  const service = serviceOrNull();
  if (!service) return null;
  // Installs the app itself reported (migration 092): platform, app version, OS, last seen.
  // Not there yet (migration not applied) means: fall back to push registrations only.
  const installs = await (service as unknown as SupabaseClient)
    .from('app_devices')
    .select('platform, app_version, os_version, first_seen_at, last_seen_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .limit(20);
  if (!installs.error && installs.data?.length) {
    return (installs.data as { platform: string; app_version: string | null; os_version: string | null; first_seen_at: string; last_seen_at: string }[]).map((d) => ({ platform: d.platform, registeredAt: d.first_seen_at, lastSeenAt: d.last_seen_at, appVersion: d.app_version, osVersion: d.os_version }));
  }
  const { data, error } = await service
    .from('push_tokens')
    .select('platform, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(`Could not read their devices: ${error.message}`);
  return (data ?? []).map((d) => ({ platform: d.platform, registeredAt: d.created_at, lastSeenAt: d.updated_at }));
}

/** Admin actions recorded against this person (suspensions, notes, wallet changes, deletion), newest first. */
export async function getUserAudit(userId: string): Promise<UserAuditEntry[]> {
  if (!isUuid(userId)) return [];
  const supabase = (await createSessionClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('id, at, actor, actor_kind, action, target_table, detail')
    .eq('target_id', userId)
    .order('at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`Could not read the audit log: ${error.message}`);
  const raw = (data ?? []) as { id: number; at: string; actor: string | null; actor_kind: string | null; action: string; target_table: string | null; detail: string | null }[];
  const ids = [...new Set(raw.map((r) => r.actor).filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', ids);
    for (const p of (profs ?? []) as { id: string; display_name: string }[]) names.set(p.id, p.display_name);
  }
  return raw.map((r) => ({
    id: r.id,
    at: r.at,
    actor: r.actor ? names.get(r.actor) ?? 'An admin' : r.actor_kind === 'operator' ? 'Owner (database)' : 'The system',
    action: r.action,
    table: r.target_table,
    detail: r.detail,
  }));
}
