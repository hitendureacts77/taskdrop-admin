import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { one } from './shared';
import { namesFor } from './people';

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

export async function getPromotions(limit = 100): Promise<PromotionRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('task_promotions')
    .select('id, task_id, user_id, amount_minor, days, status, starts_at, ends_at, created_at, tasks(title)')
    .order('created_at', { ascending: false })
    .limit(limit);
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
  const rows = (data ?? []) as unknown as Row[];
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
