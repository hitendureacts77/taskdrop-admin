import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Allowlist } from './allowlist';
import { adminAllowlist, isAllowedIdentity } from './auth';
import { getNavCounts, getRazorpayXState, getPayoutMethod, hasServiceKey, type NavCounts, type PayoutMethod, type RazorpayXState } from './data';
import { createClient as createSessionClient } from './supabase/server';
import { createClient as createServiceClient } from './supabase/service';
import { asStaffRole, type StaffRole } from './staff-roles';

/**
 * Reads for the Admin & configuration screens (team, switches, integrations,
 * system health, audit log). Same rules as data.ts: the session client for
 * everything RLS lets an admin read, the service client read-only for what it
 * can't (auth.users: email, phone, last sign-in, authenticator). Every page
 * calls requireAdmin() before any of these.
 */

function serviceOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------- team --

export type TeamMember = {
  id: string;
  name: string;
  username: string | null;
  /** Also posts or works in the app. */
  otherRoles: string[];
  staffRole: StaffRole;
  /** Gets staff alerts (withdrawals, disputes, help requests) in the app. */
  notify: boolean;
  email: string | null;
  phone: string | null;
  lastSignIn: string | null;
  /** null when the service key isn't set, so it can't be known. */
  authenticator: boolean | null;
  /** Passes the ADMIN_EMAIL / ADMIN_PHONE list, so the panel lets them in. null when unknown. */
  canOpenPanel: boolean | null;
};

export async function getTeam(): Promise<TeamMember[]> {
  const supabase = await createSessionClient();
  const { data: admins, error } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
  if (error) throw new Error(`Could not read admin roles: ${error.message}`);
  const ids = [...new Set(((admins ?? []) as { user_id: string }[]).map((r) => r.user_id))];
  if (!ids.length) return [];

  const [{ data: roles }, { data: profs }, { data: staffRows }] = await Promise.all([
    supabase.from('user_roles').select('user_id, role').in('user_id', ids),
    supabase.from('profiles').select('id, display_name, username').in('id', ids),
    // Newer than the generated types (migration 089).
    (supabase as unknown as SupabaseClient).from('admin_staff').select('user_id, staff_role, notify').in('user_id', ids),
  ]);
  const staff = new Map(((staffRows ?? []) as { user_id: string; staff_role: string; notify: boolean }[]).map((r) => [r.user_id, r]));
  const all = (roles ?? []) as { user_id: string; role: string }[];
  const byId = new Map(((profs ?? []) as { id: string; display_name: string; username: string | null }[]).map((p) => [p.id, p]));

  const service = serviceOrNull();
  const auth = new Map<string, { email: string | null; phone: string | null; last: string | null; mfa: boolean }>();
  if (service) {
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await service.auth.admin.getUserById(id);
        const u = data?.user;
        if (!u) return;
        auth.set(id, {
          email: u.email ?? null,
          phone: u.phone || null,
          last: u.last_sign_in_at ?? null,
          mfa: (u.factors ?? []).some((f) => f.status === 'verified'),
        });
      }),
    );
  }

  return ids
    .map((id) => {
      const p = byId.get(id);
      const a = auth.get(id);
      return {
        id,
        name: p?.display_name || 'No name yet',
        username: p?.username ?? null,
        otherRoles: all.filter((r) => r.user_id === id && r.role !== 'admin').map((r) => r.role),
        staffRole: asStaffRole(staff.get(id)?.staff_role),
        notify: staff.get(id)?.notify ?? true,
        email: a?.email ?? null,
        phone: a?.phone ?? null,
        lastSignIn: a?.last ?? null,
        authenticator: a ? a.mfa : null,
        canOpenPanel: a ? isAllowedIdentity(a.email) : null,
      };
    })
    .sort((x, y) => x.name.localeCompare(y.name));
}

// ---------------------------------------------------------------- switches --

export type Switch = { key: string; on: boolean; updatedAt: string | null; exists: boolean };

export const SWITCH_KEYS = ['admin_require_mfa', 'dev_otp_for_all'] as const;
export type SwitchKey = (typeof SWITCH_KEYS)[number];

export async function getSwitches(): Promise<{ switches: Record<SwitchKey, Switch>; payoutMethod: PayoutMethod }> {
  const supabase = await createSessionClient();
  const [{ data }, payoutMethod] = await Promise.all([
    supabase.from('settings').select('key, value, updated_at').in('key', SWITCH_KEYS as unknown as string[]),
    getPayoutMethod(),
  ]);
  const rows = (data ?? []) as { key: string; value: unknown; updated_at: string | null }[];
  const switches = Object.fromEntries(
    SWITCH_KEYS.map((k) => {
      const r = rows.find((x) => x.key === k);
      // admin_require_mfa is on unless explicitly false (lib/mfa.ts); the others are off unless true.
      const on = k === 'admin_require_mfa' ? r?.value !== false : r?.value === true || r?.value === 'true';
      return [k, { key: k, on, updatedAt: r?.updated_at ?? null, exists: Boolean(r) }];
    }),
  ) as Record<SwitchKey, Switch>;
  return { switches, payoutMethod };
}

// ------------------------------------------------------------ integrations --

export type Integrations = {
  supabase: { projectRef: string; ok: boolean; ms: number | null; error: string | null };
  serviceKey: boolean;
  allowlist: Allowlist;
  razorpayx: RazorpayXState;
  payoutMethod: PayoutMethod;
  lastPayment: string | null;
  pushDevices: number | null;
  idleMinutes: number;
};

export async function getIntegrations(): Promise<Integrations> {
  const supabase = await createSessionClient();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const projectRef = (() => {
    try {
      return new URL(url).hostname.split('.')[0] ?? '';
    } catch {
      return '';
    }
  })();

  const ping = await timed(() => supabase.from('settings').select('key', { head: true, count: 'exact' }));
  const service = serviceOrNull();
  const [razorpayx, payoutMethod, lastPayment, pushDevices] = await Promise.all([
    getRazorpayXState().catch((e: unknown) => ({ configured: false, balanceMinor: null, error: e instanceof Error ? e.message : 'No answer' })),
    getPayoutMethod(),
    service
      ? service
          .from('payments')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data }) => ((data ?? []) as { created_at: string }[])[0]?.created_at ?? null)
      : Promise.resolve(null),
    service
      ? service
          .from('push_tokens')
          .select('token', { head: true, count: 'exact' })
          .then(({ count, error }) => (error ? null : count ?? 0))
      : Promise.resolve(null),
  ]);

  return {
    supabase: { projectRef, ok: !ping.error, ms: ping.error ? null : ping.ms, error: ping.error },
    serviceKey: hasServiceKey(),
    allowlist: adminAllowlist(),
    razorpayx,
    payoutMethod,
    lastPayment,
    pushDevices,
    idleMinutes: Math.max(1, Number(process.env.ADMIN_IDLE_MINUTES) || 30),
  };
}

// ------------------------------------------------------------------ health --

export type Check = { name: string; what: string; ok: boolean; detail: string; ms: number | null };

export type Health = {
  checkedAt: string;
  checks: Check[];
  queues: NavCounts;
  latest: { label: string; at: string | null; href: string }[];
  runtime: { env: string; commit: string | null; region: string | null; node: string };
};

async function timed(fn: () => PromiseLike<{ error: { message: string } | null }>): Promise<{ ms: number; error: string | null }> {
  const t = Date.now();
  try {
    const { error } = await fn();
    return { ms: Date.now() - t, error: error?.message ?? null };
  } catch (e) {
    return { ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getHealth(): Promise<Health> {
  const supabase = await createSessionClient();
  // Tables and functions are newer than the generated types in places.
  const db = supabase as unknown as SupabaseClient;
  const head = (table: string) => () => db.from(table).select('*', { head: true, count: 'exact' });

  // Each feature, by the table or function it needs (and the migration that adds it).
  const probes: { name: string; what: string; run: () => PromiseLike<{ error: { message: string } | null }> }[] = [
    { name: 'Database', what: 'Reads the settings table', run: head('settings') },
    { name: 'Money ledger', what: 'platform_ledger', run: head('platform_ledger') },
    { name: 'Earnings totals', what: 'platform_earnings()', run: () => db.rpc('platform_earnings') },
    { name: 'Payout queue', what: 'admin_payout_queue()', run: () => db.rpc('admin_payout_queue') },
    { name: 'RazorpayX money position', what: 'admin_money_position() · migration 066', run: () => db.rpc('admin_money_position') },
    { name: 'Customer hub (CRM)', what: 'crm_notes · migration 071', run: head('crm_notes') },
    { name: 'Copyright notices', what: 'copyright_notices · migration 085', run: head('copyright_notices') },
    { name: 'Account deletion', what: 'account_deletions · migration 087', run: head('account_deletions') },
    { name: 'Audit log', what: 'admin_audit_log', run: head('admin_audit_log') },
  ];

  const results = await Promise.all(probes.map((p) => timed(p.run)));
  const checks: Check[] = probes.map((p, i) => {
    const r = results[i]!;
    return { name: p.name, what: p.what, ok: !r.error, ms: r.ms, detail: r.error ? r.error : 'Working' };
  });

  const service = serviceOrNull();
  checks.push({
    name: 'Service key',
    what: 'SUPABASE_SERVICE_ROLE_KEY on this server',
    ok: Boolean(service),
    ms: null,
    detail: service ? 'Set' : 'Not set: refunds, emails, phones and authenticator status are hidden',
  });

  const latestOf = async (table: string, col: string) => {
    const { data } = await db.from(table).select(col).order(col, { ascending: false }).limit(1);
    return ((data ?? []) as unknown as Record<string, string>[])[0]?.[col] ?? null;
  };
  const [queues, ledger, job, person, ticket] = await Promise.all([
    getNavCounts(),
    latestOf('platform_ledger', 'created_at').catch(() => null),
    latestOf('tasks', 'created_at').catch(() => null),
    latestOf('profiles', 'created_at').catch(() => null),
    latestOf('support_tickets', 'created_at').catch(() => null),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    checks,
    queues,
    latest: [
      { label: 'Money moved', at: ledger, href: '/money/entries' },
      { label: 'Job posted', at: job, href: '/tasks' },
      { label: 'Person joined', at: person, href: '/users?filter=new_today' },
      { label: 'Help request', at: ticket, href: '/support' },
    ],
    runtime: {
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      region: process.env.VERCEL_REGION ?? null,
      node: process.version,
    },
  };
}

// --------------------------------------------------------------- audit log --

export type AuditRow = {
  id: number;
  at: string;
  actor: string | null;
  actorName: string;
  actorKind: string | null;
  action: string;
  table: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  detail: string | null;
};

/** The tables whose changes the database records (private.audit_change triggers), with a plain name each. */
export const AUDIT_TABLES: Record<string, string> = {
  settings: 'Settings',
  user_roles: 'Admin access',
  payouts: 'Payouts',
  wallet_adjustments: 'Wallet changes',
  dispute_decisions: 'Dispute decisions',
  user_suspensions: 'Suspensions',
  crm_broadcasts: 'Messages sent',
  copyright_notices: 'Copyright',
  // Staff actions written with admin_log_event: warnings, reports closed, things hidden, promotions paused.
  event: 'Staff actions',
};

/** The staff actions in plain words, by the name the database logs them under. */
export const EVENT_WORDS: Record<string, string> = {
  'user.warn': 'Warned a person',
  'report.actioned': 'Closed a report as acted on',
  'report.dismissed': 'Dismissed a report',
  'message.hide': 'Hid a message',
  'message.unhide': 'Showed a hidden message again',
  'review.hide': 'Removed a review',
  'review.unhide': 'Put a review back',
  'media.hide': 'Hid a photo',
  'media.unhide': 'Showed a hidden photo again',
  'task.hide': 'Hid a job',
  'task.unhide': 'Showed a hidden job again',
  'task.category': 'Changed a job\'s category',
  pause_promotion: 'Paused a promotion',
  'crm.assign_owner': 'Assigned a customer to staff',
  'crm.task_add': 'Added a follow-up',
};

export async function getAuditLog(table: string | null, page: number, pageSize = 40): Promise<{ rows: AuditRow[]; total: number }> {
  const supabase = await createSessionClient();
  const db = supabase as unknown as SupabaseClient;
  let q = db.from('admin_audit_log').select('id, at, actor, actor_kind, action, target_table, target_id, before, after, detail', { count: 'exact' });
  if (table) q = q.eq('target_table', table);
  const from = page * pageSize;
  const { data, error, count } = await q.order('at', { ascending: false }).order('id', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw new Error(`Could not read the audit log: ${error.message}`);
  const raw = (data ?? []) as {
    id: number;
    at: string;
    actor: string | null;
    actor_kind: string | null;
    action: string;
    target_table: string | null;
    target_id: string | null;
    before: unknown;
    after: unknown;
    detail: string | null;
  }[];
  const actorIds = [...new Set(raw.map((r) => r.actor).filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', actorIds);
    for (const p of (profs ?? []) as { id: string; display_name: string }[]) names.set(p.id, p.display_name);
  }
  return {
    total: count ?? raw.length,
    rows: raw.map((r) => ({
      id: r.id,
      at: r.at,
      actor: r.actor,
      actorName: r.actor ? names.get(r.actor) ?? 'An admin' : r.actor_kind === 'operator' ? 'Owner (database)' : 'The system',
      actorKind: r.actor_kind,
      action: r.action,
      table: r.target_table,
      targetId: r.target_id,
      before: r.before,
      after: r.after,
      detail: r.detail,
    })),
  };
}
