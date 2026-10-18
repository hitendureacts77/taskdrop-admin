import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { namesFor } from './people';
import { isUuid } from './tasks';

// ---------------------------------------------------------------- disputes --

export type DisputeRow = {
  taskId: string;
  title: string;
  posterId: string;
  poster: string;
  workerId: string | null;
  worker: string | null;
  escrowMinor: number;
  lockedMinor: number;
  /** Whether the poster actually paid. Unpaid jobs have nothing frozen. */
  funded: boolean;
  since: string;
  /** What the person who reported it said, when the report carried one. */
  reason: string | null;
  reasonBy: string | null;
};

export type DisputeReason = { reason: string; byId: string | null; by: string | null; at: string };

/**
 * Why each of these jobs was reported, newest report first per job (migration
 * 072). The table is newer than the generated types, so it is read untyped. A
 * failed read just leaves the reason out; it never blocks the decision.
 */
export async function getDisputeReasons(taskIds: string[]): Promise<Map<string, DisputeReason>> {
  const out = new Map<string, DisputeReason>();
  const ids = taskIds.filter(isUuid);
  if (ids.length === 0) return out;
  const supabase = (await createSessionClient()) as unknown as {
    from: (t: string) => {
      select: (c: string) => { in: (k: string, v: string[]) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }> } };
    };
  };
  const { data, error } = await supabase.from('task_disputes').select('task_id, reason, opened_by, created_at').in('task_id', ids).order('created_at', { ascending: false });
  if (error) return out;
  const rows = (data ?? []) as { task_id: string; reason: string; opened_by: string | null; created_at: string }[];
  const names = await namesFor(rows.map((r) => r.opened_by ?? ''));
  for (const r of rows) {
    if (out.has(r.task_id)) continue;
    out.set(r.task_id, { reason: r.reason, byId: r.opened_by, by: r.opened_by ? (names.get(r.opened_by) ?? null) : null, at: r.created_at });
  }
  return out;
}

export async function getDisputes(): Promise<DisputeRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, poster_id, locked_minor, updated_at, funded_at, assignments(worker_id, escrow_minor, created_at)')
    .eq('status', 'DISPUTED')
    .order('updated_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`Could not read disputes: ${error.message}`);
  type A = { worker_id: string; escrow_minor: number; created_at: string };
  type Row = { id: string; title: string; poster_id: string; locked_minor: number | null; updated_at: string; funded_at: string | null; assignments: A[] | A | null };
  const rows = (data ?? []) as unknown as Row[];
  const latest = (r: Row) =>
    (Array.isArray(r.assignments) ? [...r.assignments] : r.assignments ? [r.assignments] : []).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const [names, reasons] = await Promise.all([
    namesFor([...rows.map((r) => r.poster_id), ...rows.map((r) => latest(r)?.worker_id ?? '')]),
    getDisputeReasons(rows.map((r) => r.id)),
  ]);
  return rows.map((r) => {
    const a = latest(r);
    return {
      reason: reasons.get(r.id)?.reason ?? null,
      reasonBy: reasons.get(r.id)?.by ?? null,
      taskId: r.id,
      title: r.title,
      posterId: r.poster_id,
      poster: names.get(r.poster_id) ?? 'Poster',
      workerId: a?.worker_id ?? null,
      worker: a ? names.get(a.worker_id) ?? 'Worker' : null,
      escrowMinor: Number(a?.escrow_minor ?? 0),
      lockedMinor: Number(r.locked_minor ?? 0),
      funded: Boolean(r.funded_at),
      since: r.updated_at,
    };
  });
}
