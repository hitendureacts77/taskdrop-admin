import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { one } from './shared';
import { namesFor } from './people';
import { isTestTitle, notTestIdFilter } from '../test-data';

// -------------------------------------------------------------- promotions --

export type PromotionRow = {
  id: string;
  taskId: string;
  title: string;
  userId: string;
  user: string;
  amountMinor: number;
  days: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

/** `hideTest` (admin v2 "Hide test data"): leave out fake seed payers and "[e2e]" jobs. */
export async function getPromotions(limit = 100, opts: { hideTest?: boolean } = {}): Promise<PromotionRow[]> {
  const supabase = await createSessionClient();
  let q = supabase
    .from('task_promotions')
    .select('id, task_id, user_id, amount_minor, days, status, starts_at, ends_at, created_at, tasks(title)');
  if (opts.hideTest) q = q.or(notTestIdFilter('user_id'));
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Could not read promotions: ${error.message}`);
  type Row = {
    id: string;
    task_id: string;
    user_id: string;
    amount_minor: number;
    days: number;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string;
    tasks: { title: string } | { title: string }[] | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !opts.hideTest || !isTestTitle(one(r.tasks)?.title));
  const names = await namesFor(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    id: r.id,
    taskId: r.task_id,
    title: one(r.tasks)?.title ?? 'Job',
    userId: r.user_id,
    user: names.get(r.user_id) ?? 'Someone',
    amountMinor: Number(r.amount_minor),
    days: r.days,
    status: r.status,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
  }));
}
