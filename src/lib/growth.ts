import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { namesFor } from './data';
import type { DailyRow, FunnelRow, RetentionRow, StaffPerf } from './growth-calc';
import { createClient } from './supabase/server';
import { createClient as createServiceClient } from './supabase/service';

/**
 * Reads for the moderation queue, follow-ups, pipeline, team performance,
 * reports and the money check (migrations 093 to 096 in the app repo). Callers
 * must call requireAdmin() first. Every read says plainly when its migration
 * has not been applied yet (`setup: true`) instead of failing the page.
 */

export type Read<T> = { data: T; setup: boolean; error: string | null };

const NOT_THERE = /does not exist|could not find the (function|table)|schema cache|PGRST20[24]|42883|42P01/i;

async function db(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

async function rpc<T>(fn: string, args: Record<string, unknown>, empty: T, map: (rows: Record<string, unknown>[]) => T): Promise<Read<T>> {
  const supabase = await db();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { data: empty, setup, error: setup ? null : error.message };
  }
  return { data: map(Array.isArray(data) ? (data as Record<string, unknown>[]) : []), setup: false, error: null };
}

async function select<T>(table: string, build: (q: ReturnType<SupabaseClient['from']>) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>, empty: T, map: (rows: Record<string, unknown>[]) => Promise<T> | T): Promise<Read<T>> {
  const supabase = await db();
  const { data, error } = await build(supabase.from(table));
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { data: empty, setup, error: setup ? null : error.message };
  }
  return { data: await map(Array.isArray(data) ? (data as Record<string, unknown>[]) : []), setup: false, error: null };
}

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => (v == null ? '' : String(v));

// ------------------------------------------------------------ moderation --

export type ReportRow = {
  id: string;
  reporterId: string;
  reporter: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  reason: string;
  status: string;
  resolution: string | null;
  handledBy: string | null;
  createdAt: string;
  hidden: boolean;
  /** For a reported message: what it says and whether staff have hidden it. Null when it cannot be read. */
  message: { body: string; hidden: boolean } | null;
};

/** Reported messages, read with the service key (an admin is not in the thread, so RLS shows nothing). */
async function reportedMessages(ids: string[]): Promise<Map<string, { body: string; hidden: boolean }>> {
  const out = new Map<string, { body: string; hidden: boolean }>();
  if (!ids.length) return out;
  try {
    // message_moderation is newer than the generated types.
    const service = createServiceClient() as unknown as SupabaseClient;
    const [msgs, mods] = await Promise.all([
      service.from('messages').select('id, body').in('id', ids),
      service.from('message_moderation').select('message_id').in('message_id', ids),
    ]);
    const hidden = new Set(((mods.data ?? []) as { message_id: string }[]).map((m) => m.message_id));
    for (const m of (msgs.data ?? []) as { id: string; body: string }[]) out.set(m.id, { body: m.body.startsWith('::media::') ? '(a photo)' : m.body.slice(0, 1000), hidden: hidden.has(m.id) });
  } catch {
    /* no service key, or migration 118 not applied: the card just shows no text */
  }
  return out;
}

export async function getReports(status: 'open' | 'done'): Promise<Read<ReportRow[]>> {
  const r = await select<ReportRow[]>(
    'reports',
    (q) => {
      const base = q.select('id, reporter_id, target_type, target_id, reason, status, resolution, handled_by, created_at');
      return (status === 'open' ? base.eq('status', 'open') : base.neq('status', 'open')).order('created_at', { ascending: status === 'open' }).limit(100);
    },
    [],
    async (rows) => {
      const supabase = await db();
      const ids = [...new Set(rows.flatMap((x) => [str(x.reporter_id), str(x.handled_by), x.target_type === 'user' ? str(x.target_id) : '']).filter(Boolean))];
      const names = await namesFor(ids);
      const taskIds = rows.filter((x) => x.target_type === 'task').map((x) => str(x.target_id));
      const titles = new Map<string, string>();
      const hidden = new Set<string>();
      if (taskIds.length) {
        const { data: t } = await supabase.from('tasks').select('id, title').in('id', taskIds);
        for (const x of (t ?? []) as { id: string; title: string }[]) titles.set(x.id, x.title);
        const { data: h } = await supabase.from('task_moderation').select('task_id').in('task_id', taskIds);
        for (const x of (h ?? []) as { task_id: string }[]) hidden.add(x.task_id);
      }
      const messages = await reportedMessages(rows.filter((x) => x.target_type === 'message').map((x) => str(x.target_id)));
      return rows.map((x) => {
        const type = str(x.target_type);
        const target = str(x.target_id);
        return {
          id: str(x.id),
          reporterId: str(x.reporter_id),
          reporter: names.get(str(x.reporter_id)) ?? 'Someone',
          targetType: type,
          targetId: target,
          targetLabel: type === 'user' ? names.get(target) ?? 'A person' : type === 'task' ? titles.get(target) ?? 'A job' : type === 'review' ? 'A review' : 'A message',
          reason: str(x.reason),
          status: str(x.status),
          resolution: x.resolution ? str(x.resolution) : null,
          handledBy: x.handled_by ? names.get(str(x.handled_by)) ?? 'An admin' : null,
          createdAt: str(x.created_at),
          hidden: hidden.has(target),
          message: type === 'message' ? messages.get(target) ?? null : null,
        };
      });
    },
  );
  return r;
}

export async function countOpenReports(): Promise<number> {
  const supabase = await db();
  const { count, error } = await supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open');
  return error ? 0 : count ?? 0;
}

export async function isTaskHidden(taskId: string): Promise<{ hidden: boolean; reason: string | null; setup: boolean }> {
  const supabase = await db();
  const { data, error } = await supabase.from('task_moderation').select('reason').eq('task_id', taskId).maybeSingle();
  if (error) return { hidden: false, reason: null, setup: NOT_THERE.test(`${error.code ?? ''} ${error.message}`) };
  return { hidden: Boolean(data), reason: data ? str((data as { reason: unknown }).reason) : null, setup: false };
}

// ------------------------------------------------------------ follow-ups --

export type FollowUp = {
  id: string;
  title: string;
  detail: string | null;
  userId: string | null;
  person: string | null;
  taskId: string | null;
  dueAt: string | null;
  ownerId: string | null;
  owner: string;
  status: string;
  source: string;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
};

const FOLLOW_UP_COLS = 'id, title, detail, user_id, task_id, due_at, owner_id, status, source, completed_by, completed_at, created_at';

export type FollowUpFilter = { view: 'mine' | 'all' | 'done'; me: string } | { userId: string };

export async function getFollowUps(view: 'mine' | 'all' | 'done', me: string): Promise<Read<FollowUp[]>> {
  return readFollowUps({ view, me });
}

/** Every follow-up about one person, newest first. */
export async function getUserFollowUps(userId: string): Promise<Read<FollowUp[]>> {
  return readFollowUps({ userId });
}

async function readFollowUps(f: FollowUpFilter): Promise<Read<FollowUp[]>> {
  return select<FollowUp[]>(
    'crm_tasks',
    (q) => {
      const base = q.select(FOLLOW_UP_COLS);
      if ('userId' in f) return base.eq('user_id', f.userId).order('created_at', { ascending: false }).limit(50);
      const filtered = f.view === 'done' ? base.eq('status', 'done').order('completed_at', { ascending: false }) : base.eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false });
      return (f.view === 'mine' ? filtered.eq('owner_id', f.me) : filtered).limit(200);
    },
    [],
    async (rows) => {
      const ids = [...new Set(rows.flatMap((x) => [str(x.user_id), str(x.owner_id), str(x.completed_by)]).filter(Boolean))];
      const names = await namesFor(ids);
      return rows.map((x) => ({
        id: str(x.id),
        title: str(x.title),
        detail: x.detail ? str(x.detail) : null,
        userId: x.user_id ? str(x.user_id) : null,
        person: x.user_id ? names.get(str(x.user_id)) ?? 'A person' : null,
        taskId: x.task_id ? str(x.task_id) : null,
        dueAt: x.due_at ? str(x.due_at) : null,
        ownerId: x.owner_id ? str(x.owner_id) : null,
        owner: x.owner_id ? names.get(str(x.owner_id)) ?? 'An admin' : 'Nobody',
        status: str(x.status),
        source: str(x.source),
        completedBy: x.completed_by ? names.get(str(x.completed_by)) ?? 'An admin' : null,
        completedAt: x.completed_at ? str(x.completed_at) : null,
        createdAt: str(x.created_at),
      }));
    },
  );
}

export async function getPipeline(): Promise<Read<Record<string, { people: number; atRisk: number }>>> {
  return rpc('admin_pipeline_counts', {}, {}, (rows) => Object.fromEntries(rows.map((r) => [str(r.stage), { people: num(r.people), atRisk: num(r.at_risk) }])));
}

/** Staff who can be given a follow-up: everyone holding the admin role. */
export async function getStaffList(): Promise<{ id: string; name: string }[]> {
  const supabase = await db();
  const { data } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
  const ids = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
  const names = await namesFor(ids);
  return ids.map((id) => ({ id, name: names.get(id) ?? 'An admin' })).sort((a, b) => a.name.localeCompare(b.name));
}

// ----------------------------------------------------- team performance --

export type StaffPerfRow = StaffPerf & { name: string; staffRole: string };

export async function getStaffPerformance(fromIso: string, toIso: string): Promise<Read<StaffPerfRow[]>> {
  const r = await rpc<(StaffPerf & { staffRole: string })[]>('admin_staff_performance', { p_from: fromIso, p_to: toIso }, [], (rows) =>
    rows.map((x) => ({
      userId: str(x.user_id),
      tasksDone: num(x.tasks_done),
      tasksOnTime: num(x.tasks_on_time),
      tasksOpen: num(x.tasks_open),
      tasksOverdue: num(x.tasks_overdue),
      notes: num(x.notes),
      ticketReplies: num(x.ticket_replies),
      reportsHandled: num(x.reports_handled),
      disputesDecided: num(x.disputes_decided),
      suspensions: num(x.suspensions),
      broadcasts: num(x.broadcasts),
      customersOwned: num(x.customers_owned),
      firstResponseMinutes: x.first_response_minutes == null ? null : num(x.first_response_minutes),
      staffRole: str(x.staff_role) || 'admin',
    })),
  );
  const names = await namesFor(r.data.map((x) => x.userId));
  return { ...r, data: r.data.map((x) => ({ ...x, name: names.get(x.userId) ?? 'An admin' })) };
}

// ----------------------------------------------------------- analytics --

export async function getBusinessDaily(from: string, to: string): Promise<Read<DailyRow[]>> {
  return rpc('admin_business_daily', { p_from: from, p_to: to }, [], (rows) =>
    rows.map((x) => ({
      day: str(x.day),
      newPeople: num(x.new_people),
      jobsPosted: num(x.jobs_posted),
      jobsFinished: num(x.jobs_finished),
      cancellations: num(x.cancellations),
      disputesDecided: num(x.disputes_decided),
      fundedMinor: num(x.funded_minor),
      topupMinor: num(x.topup_minor),
      revenueMinor: num(x.revenue_minor),
    })),
  );
}

export async function getFunnel(from: string, to: string): Promise<Read<FunnelRow | null>> {
  return rpc<FunnelRow | null>('admin_funnel', { p_from: from, p_to: to }, null, (rows) => {
    const x = rows[0];
    return x ? { joined: num(x.joined), engaged: num(x.engaged), funded: num(x.funded), completed: num(x.completed), repeat: num(x.repeat) } : null;
  });
}

export async function getRetention(weeks = 8): Promise<Read<RetentionRow[]>> {
  return rpc('admin_retention', { p_weeks: weeks }, [], (rows) =>
    rows.map((x) => ({ cohortWeek: str(x.cohort_week), weekOffset: num(x.week_offset), cohortSize: num(x.cohort_size), active: num(x.active) })),
  );
}

export type PromoRoi = { promotions: number; active: number; spendMinor: number; impressions: number; clicks: number };

export async function getPromotionRoi(from: string, to: string): Promise<Read<PromoRoi | null>> {
  return rpc<PromoRoi | null>('admin_promotion_roi', { p_from: from, p_to: to }, null, (rows) => {
    const x = rows[0];
    return x ? { promotions: num(x.promotions), active: num(x.active), spendMinor: num(x.spend_minor), impressions: num(x.impressions), clicks: num(x.clicks) } : null;
  });
}

// ------------------------------------------------------ reconciliation --

export type ReconcileRow = { code: string; severity: string; refType: string; refId: string; amountMinor: number | null; at: string | null; detail: string };

export async function getReconcile(from: string, to: string): Promise<Read<ReconcileRow[]>> {
  return rpc('admin_reconcile', { p_from: from, p_to: to }, [], (rows) =>
    rows.map((x) => ({
      code: str(x.check_code),
      severity: str(x.severity),
      refType: str(x.ref_type),
      refId: str(x.ref_id),
      amountMinor: x.amount_minor == null ? null : num(x.amount_minor),
      at: x.at ? str(x.at) : null,
      detail: str(x.detail),
    })),
  );
}
