import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EVENT_WORDS, type AuditRow } from './admin-config';
import { notHeartbeatOr, type AuditScope } from './audit-scope';
import { auditPersonId } from './audit-target';
import { searchKeys, V2_AUDIT_AREAS } from './audit-words';
import { createClient as createSessionClient } from './supabase/server';

/**
 * The audit log for admin v2 (WP8b). Same table, same rules as getAuditLog in
 * admin-config.ts (which the gate-off page keeps using), plus the v2 filters:
 * a search box and "Hide test data" (rows about the fake seed people
 * fa4e0001-…), both applied in the query so the page count matches the rows.
 * Callers must call requireSeeing('settings') first.
 */

const TEST_PREFIX = 'fa4e0001-';

export type AuditV2Query = { table: string | null; page: number; pageSize: number; scope: AuditScope; q: string; hideTest: boolean };

/** Only areas the page knows; anything else means "Everything". */
export function asAuditArea(v: unknown): string | null {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(V2_AUDIT_AREAS, v) ? v : null;
}

export async function getAuditLogV2(o: AuditV2Query): Promise<{ rows: AuditRow[]; total: number }> {
  const supabase = await createSessionClient();
  const db = supabase as unknown as SupabaseClient;
  let q = db.from('admin_audit_log').select('id, at, actor, actor_kind, action, target_table, target_id, before, after, detail', { count: 'exact' });
  if (o.table) q = q.eq('target_table', o.table);
  if (o.scope === 'default') q = q.or(notHeartbeatOr());
  else if (o.scope === 'staff') q = q.not('actor', 'is', null);

  if (o.hideTest) {
    // Each .or() is ANDed: a row stays unless one of its person fields is a fake seed id. Nulls stay.
    q = q
      .or(`target_id.is.null,and(target_id.not.ilike.${TEST_PREFIX}*,target_id.not.ilike."user:${TEST_PREFIX}*")`)
      .or(`after->>user_id.is.null,after->>user_id.not.ilike.${TEST_PREFIX}*`)
      .or(`before->>user_id.is.null,before->>user_id.not.ilike.${TEST_PREFIX}*`)
      .or(`after->>to_user.is.null,after->>to_user.not.ilike.${TEST_PREFIX}*`);
  }

  if (o.q) {
    // o.q is already cleaned (cleanSearch): no commas, brackets, quotes or stars.
    const like = `"*${o.q}*"`;
    const parts = [`action.ilike.${like}`, `target_id.ilike.${like}`, `detail.ilike.${like}`];
    const extra = searchKeys(o.q, EVENT_WORDS);
    if (extra.settingKeys.length) parts.push(`target_id.in.(${extra.settingKeys.join(',')})`);
    if (extra.actions.length) parts.push(`action.in.(${extra.actions.map((a) => `"${a}"`).join(',')})`);
    q = q.or(parts.join(','));
  }

  const from = o.page * o.pageSize;
  const { data, error, count } = await q.order('at', { ascending: false }).order('id', { ascending: false }).range(from, from + o.pageSize - 1);
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

  const personOf = (r: (typeof raw)[number]) => auditPersonId({ table: r.target_table, targetId: r.target_id, before: r.before, after: r.after });
  const taskOf = (r: (typeof raw)[number]): string | null => {
    if (r.target_table !== 'dispute_decisions') return null;
    for (const side of [r.after, r.before]) {
      const v = side && typeof side === 'object' ? (side as Record<string, unknown>).task_id : undefined;
      if (typeof v === 'string' && v) return v;
    }
    return null;
  };

  const ids = [...new Set([...raw.map((r) => r.actor), ...raw.map(personOf)].filter((x): x is string => Boolean(x)))];
  const taskIds = [...new Set(raw.map(taskOf).filter((x): x is string => Boolean(x)))];
  const [profs, tasks] = await Promise.all([
    ids.length ? supabase.from('profiles').select('id, display_name').in('id', ids) : Promise.resolve({ data: [] }),
    taskIds.length ? supabase.from('tasks').select('id, title').in('id', taskIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map(((profs.data ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]));
  const titles = new Map(((tasks.data ?? []) as { id: string; title: string }[]).map((t) => [t.id, t.title]));

  return {
    total: count ?? raw.length,
    rows: raw.map((r) => {
      const personId = personOf(r);
      const taskId = taskOf(r);
      return {
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
        personId,
        personName: personId ? names.get(personId) ?? 'A person' : null,
        taskId,
        taskTitle: taskId ? titles.get(taskId)?.trim() || null : null,
      };
    }),
  };
}
