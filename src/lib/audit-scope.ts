/**
 * Which audit-log lines the list shows (B117). A background job writes a settings marker every
 * ten minutes (public_snapshots_last_ok), which buried staff actions. Nothing is deleted: the
 * default list leaves heartbeats out, "Staff only" shows lines a member of staff wrote, and
 * "Everything" shows every line. Pure, so it can be tested.
 */
export type AuditScope = 'default' | 'staff' | 'all';

/** Settings keys that only say "a job ran"; written by the system, not by staff. */
export const HEARTBEAT_SETTINGS: readonly string[] = ['public_snapshots_last_ok'];

export function asAuditScope(v: unknown): AuditScope {
  return v === 'staff' || v === 'all' ? v : 'default';
}

export function isHeartbeat(r: { table: string | null; targetId: string | null }): boolean {
  return r.table === 'settings' && r.targetId !== null && HEARTBEAT_SETTINGS.includes(r.targetId);
}

/** A PostgREST `or` filter that keeps every row except the heartbeat settings lines. */
export function notHeartbeatOr(): string {
  return ['target_table.is.null', 'target_table.neq.settings', `target_id.not.in.(${HEARTBEAT_SETTINGS.join(',')})`].join(',');
}
