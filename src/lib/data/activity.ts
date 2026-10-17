import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { ledgerKind } from '../labels';
import { one } from './shared';
import { namesFor } from './people';
import { isUuid, isTimestamp } from './tasks';

// ---------------------------------------------------------------- activity --

export type Movement = {
  at: string;
  what: string;
  detail: string;
  amount: number;
  tone: 'green' | 'gold' | 'blue' | 'red' | 'grey';
  status: string;
  href: string | null;
};

/** The latest money events: what TaskDrop earned, and payouts to workers. */
export async function getLatestMovements(limit = 8): Promise<Movement[]> {
  const supabase = await createSessionClient();
  const [ledger, payouts] = await Promise.all([
    supabase
      .from('platform_ledger')
      .select('kind, amount_minor, note, created_at, task_id, tasks(title)')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('payouts')
      .select('id, user_id, amount_minor, status, destination, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit),
  ]);
  const payoutRows = (payouts.data ?? []) as { id: string; user_id: string; amount_minor: number; status: string; destination: string | null; updated_at: string }[];
  const names = await namesFor(payoutRows.map((p) => p.user_id));
  const out: Movement[] = [];
  type LedgerMove = { kind: string; amount_minor: number; note: string | null; created_at: string; task_id: string | null; tasks: { title: string } | { title: string }[] | null };
  for (const l of (ledger.data ?? []) as unknown as LedgerMove[]) {
    const task = one(l.tasks);
    const negative = Number(l.amount_minor) < 0;
    out.push({
      at: l.created_at,
      what: `${ledgerKind(l.kind).label} earned`,
      detail: task?.title ?? l.note ?? '',
      amount: Number(l.amount_minor),
      tone: negative ? 'grey' : 'green',
      status: negative ? 'Taken back' : "TaskDrop's",
      href: l.task_id ? `/tasks/${l.task_id}` : null,
    });
  }
  const PAYOUT: Record<string, [string, Movement['tone']]> = {
    requested: ['Waiting to be sent', 'gold'],
    processing: ['Being sent', 'blue'],
    paid: ['Paid', 'green'],
    failed: ['Back in their wallet', 'red'],
    cancelled: ['Cancelled by them', 'grey'],
  };
  for (const p of payoutRows) {
    const [status, tone] = PAYOUT[p.status] ?? ['Updated', 'grey'];
    out.push({
      at: p.updated_at,
      what: p.status === 'requested' ? 'Asked to withdraw' : 'Withdrawal',
      detail: `${names.get(p.user_id) ?? 'Someone'}${p.destination ? ` · ${p.destination}` : ''}`,
      amount: Number(p.amount_minor),
      tone,
      status,
      href: `/payouts/${p.id}`,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export type LedgerEntry = { id: string; kind: string; amount: number; note: string | null; taskId: string | null; title: string | null; at: string };

/** The company ledger, newest first, optionally one kind and/or a time window. */
export async function getLedger(
  opts: { kind?: string; since?: Date; before?: string; after?: { at: string; id: string }; limit?: number } = {},
): Promise<LedgerEntry[]> {
  const supabase = await createSessionClient();
  let q = supabase
    .from('platform_ledger')
    .select('id, kind, amount_minor, note, created_at, task_id, tasks(title)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.since) q = q.gte('created_at', opts.since.toISOString());
  if (opts.before) q = q.lt('created_at', opts.before);
  // Keyset paging on (created_at, id): commission and fee rows from one job share a timestamp.
  if (opts.after && isTimestamp(opts.after.at) && isUuid(opts.after.id)) {
    q = q.or(`created_at.lt."${opts.after.at}",and(created_at.eq."${opts.after.at}",id.lt.${opts.after.id})`);
  }
  const { data, error } = await q;
  if (error) throw new Error(`Could not read the company ledger: ${error.message}`);
  type Row = { id: string; kind: string; amount_minor: number; note: string | null; created_at: string; task_id: string | null; tasks: { title: string } | { title: string }[] | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    amount: Number(r.amount_minor),
    note: r.note,
    taskId: r.task_id,
    title: one(r.tasks)?.title ?? null,
    at: r.created_at,
  }));
}
