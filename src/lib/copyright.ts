import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from './supabase/server';
import { namesFor } from './data';

/**
 * Copyright notices (migration 085). Read as the signed-in admin: the table's
 * only policy is private.is_admin(). Before 085 is applied the table does not
 * exist, and the page says so instead of failing.
 */

export type NoticeStatus = 'received' | 'removed' | 'rejected' | 'countered' | 'restored';

export type Notice = {
  id: string;
  receivedAt: string;
  complainant: string;
  email: string;
  work: string;
  material: string;
  taskId: string | null;
  taskTitle: string | null;
  uploaderId: string | null;
  uploader: string | null;
  status: NoticeStatus;
  removedWhat: 'media' | 'listing' | 'avatar' | null;
  removedAt: string | null;
  counterAt: string | null;
  restoreFrom: string | null;
  restoredAt: string | null;
  note: string | null;
  /** Upheld notices against the same person: removed, or countered and not yet restored. */
  strikes: number;
  /** What can still be taken down for a notice that is waiting. */
  can: { media: boolean; listing: boolean; avatar: boolean };
};

type Row = {
  id: string;
  received_at: string;
  complainant: string;
  complainant_email: string;
  work: string;
  material: string;
  task_id: string | null;
  uploader_id: string | null;
  status: NoticeStatus;
  removed_what: Notice['removedWhat'];
  removed_at: string | null;
  counter_at: string | null;
  restore_from: string | null;
  restored_at: string | null;
  note: string | null;
};

export async function getCopyrightNotices(): Promise<{ ready: boolean; rows: Notice[] }> {
  // Newer than the generated types.
  const db = (await createSessionClient()) as unknown as SupabaseClient;
  const { data, error } = await db.from('copyright_notices').select('*').order('received_at', { ascending: false }).limit(300);
  if (error) {
    if (/copyright_notices/.test(error.message) && /does not exist|schema cache/i.test(error.message)) return { ready: false, rows: [] };
    throw new Error(`Could not read copyright notices: ${error.message}`);
  }
  const rows = (data ?? []) as Row[];

  const taskIds = [...new Set(rows.map((r) => r.task_id).filter((x): x is string => Boolean(x)))];
  const uploaderIds = [...new Set(rows.map((r) => r.uploader_id).filter((x): x is string => Boolean(x)))];
  const [tasks, avatars, names] = await Promise.all([
    taskIds.length
      ? db.from('tasks').select('id, title, media_path, status, funded_at').in('id', taskIds)
      : Promise.resolve({ data: [] }),
    uploaderIds.length ? db.from('profiles').select('id, avatar_url').in('id', uploaderIds) : Promise.resolve({ data: [] }),
    namesFor(uploaderIds),
  ]);
  const taskById = new Map(
    ((tasks.data ?? []) as { id: string; title: string; media_path: string | null; status: string; funded_at: string | null }[]).map((t) => [t.id, t]),
  );
  const avatarById = new Map(((avatars.data ?? []) as { id: string; avatar_url: string | null }[]).map((p) => [p.id, p.avatar_url]));

  const strikes = new Map<string, number>();
  for (const r of rows) {
    if (r.uploader_id && (r.status === 'removed' || r.status === 'countered')) {
      strikes.set(r.uploader_id, (strikes.get(r.uploader_id) ?? 0) + 1);
    }
  }

  return {
    ready: true,
    rows: rows.map((r) => {
      const task = r.task_id ? taskById.get(r.task_id) : undefined;
      return {
        id: r.id,
        receivedAt: r.received_at,
        complainant: r.complainant,
        email: r.complainant_email,
        work: r.work,
        material: r.material,
        taskId: r.task_id,
        taskTitle: task?.title ?? null,
        uploaderId: r.uploader_id,
        uploader: r.uploader_id ? names.get(r.uploader_id) ?? 'Unknown person' : null,
        status: r.status,
        removedWhat: r.removed_what,
        removedAt: r.removed_at,
        counterAt: r.counter_at,
        restoreFrom: r.restore_from,
        restoredAt: r.restored_at,
        note: r.note,
        strikes: r.uploader_id ? strikes.get(r.uploader_id) ?? 0 : 0,
        can: {
          media: Boolean(task?.media_path),
          listing: task?.status === 'OPEN' && !task.funded_at,
          avatar: Boolean(r.uploader_id && avatarById.get(r.uploader_id)),
        },
      };
    }),
  };
}
