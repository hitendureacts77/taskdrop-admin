import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServiceClient } from './supabase/service';
import { imageKitSignConfig, mediaRefId, signedImageKitUrl } from './imagekit-sign';

/**
 * Pictures and files on a job, for staff to look at (task 6.4).
 *
 * A job's photo and a worker's proof are stored either as "media:<id>" (a
 * private picture in ImageKit, registered in the `media` table, migration 109)
 * or as a path in the Supabase Storage bucket `task-media` (older uploads,
 * videos and documents). Both are turned into short-lived signed links here, on
 * the server, with the service key and the ImageKit private key. Neither key
 * is ever sent to the browser, only the links.
 *
 * Every caller MUST call requireAdmin() first: the service client has no
 * opinion about who is asking.
 */

const BUCKET = 'task-media';
const SIGNED_URL_SECONDS = 60 * 60;

export type AdminPhoto = {
  /** What it is, e.g. "Job photo" or "Proof from Ravi". */
  label: string;
  kind: 'image' | 'video' | 'file';
  /** Small copy for the page; null when it cannot be shown. */
  thumbUrl: string | null;
  /** Full-size copy to open in a new tab; null when it cannot be shown. */
  openUrl: string | null;
  /** Why there is no picture, in plain words. */
  note: string | null;
};

export type TaskPhotos = {
  photos: AdminPhoto[];
  /** False when a picture is in ImageKit but the admin has no ImageKit settings yet. */
  imageKitReady: boolean;
};

type Item = { label: string; ref: string; kind: AdminPhoto['kind'] };
type MediaRow = { id: string; provider: string; path: string; status: string; purged_at: string | null; deleted_at: string | null };

/** Signs a list of references. Order is kept; anything that cannot be signed gets a note instead of a link. */
async function sign(items: Item[], now = Date.now()): Promise<TaskPhotos> {
  const db = createServiceClient() as unknown as SupabaseClient;
  const cfg = imageKitSignConfig(process.env);

  const ids = [...new Set(items.map((i) => mediaRefId(i.ref)).filter((x): x is string => Boolean(x)))];
  const registry = new Map<string, MediaRow>();
  if (ids.length > 0) {
    const { data } = await db.from('media').select('id, provider, path, status, purged_at, deleted_at').in('id', ids);
    for (const r of (data ?? []) as MediaRow[]) registry.set(r.id, r);
  }

  const storagePaths = [...new Set(items.filter((i) => !mediaRefId(i.ref) && !i.ref.startsWith('media:')).map((i) => i.ref))];
  const storageUrls = new Map<string, string>();
  if (storagePaths.length > 0) {
    const res = await db.storage.from(BUCKET).createSignedUrls(storagePaths, SIGNED_URL_SECONDS);
    for (const row of (res.data ?? []) as { path: string | null; signedUrl: string | null }[]) {
      if (row.path && row.signedUrl) storageUrls.set(row.path, row.signedUrl);
    }
  }

  let imageKitReady = true;
  const photos = items.map((i): AdminPhoto => {
    const none = (note: string): AdminPhoto => ({ label: i.label, kind: i.kind, thumbUrl: null, openUrl: null, note });
    const id = mediaRefId(i.ref);
    if (id) {
      const row = registry.get(id);
      if (!row) return none('This picture is not in the media list.');
      if (row.purged_at || row.deleted_at) return none('This picture was removed.');
      if (row.provider !== 'imagekit') return none('This picture is stored somewhere the admin cannot open.');
      if (!cfg) {
        imageKitReady = false;
        return none('ImageKit is not set up for the admin yet.');
      }
      return {
        label: i.label,
        kind: 'image',
        thumbUrl: signedImageKitUrl(cfg, row.path, 'card', now),
        openUrl: signedImageKitUrl(cfg, row.path, 'full', now),
        note: null,
      };
    }
    const url = storageUrls.get(i.ref);
    if (!url) return none('This file could not be opened.');
    return { label: i.label, kind: i.kind, thumbUrl: i.kind === 'image' ? url : null, openUrl: url, note: null };
  });
  return { photos, imageKitReady };
}

const kindOf = (v: unknown): AdminPhoto['kind'] => (v === 'video' || v === 'file' ? v : 'image');

/** The job's own photo or video, then each worker's proof files. Empty when there are none. */
export async function getTaskPhotos(taskId: string): Promise<TaskPhotos> {
  const db = createServiceClient() as unknown as SupabaseClient;
  const [task, proofs] = await Promise.all([
    db.from('tasks').select('media_path, media_kind').eq('id', taskId).maybeSingle(),
    db.from('task_proofs').select('worker_id, files, created_at').eq('task_id', taskId).order('created_at', { ascending: true }).limit(20),
  ]);

  const items: Item[] = [];
  const t = task.data as { media_path: string | null; media_kind?: string | null } | null;
  if (t?.media_path) items.push({ label: 'Job photo', ref: t.media_path, kind: kindOf(t.media_kind) });
  for (const p of (proofs.data ?? []) as { files: unknown }[]) {
    for (const f of Array.isArray(p.files) ? (p.files as { path?: unknown; kind?: unknown; name?: unknown }[]) : []) {
      if (typeof f.path !== 'string' || !f.path) continue;
      items.push({ label: `Proof: ${typeof f.name === 'string' && f.name ? f.name : 'file'}`, ref: f.path, kind: kindOf(f.kind) });
    }
  }
  if (items.length === 0) return { photos: [], imageKitReady: true };
  return sign(items.slice(0, 40));
}

/** The job photo for each task id, for the copyright page. A task with no photo is left out. */
export async function getJobPhotos(taskIds: string[]): Promise<Map<string, AdminPhoto>> {
  const out = new Map<string, AdminPhoto>();
  if (taskIds.length === 0) return out;
  const db = createServiceClient() as unknown as SupabaseClient;
  const { data } = await db.from('tasks').select('id, media_path, media_kind').in('id', taskIds);
  const rows = ((data ?? []) as { id: string; media_path: string | null; media_kind?: string | null }[]).filter((r) => r.media_path);
  if (rows.length === 0) return out;
  const { photos } = await sign(rows.map((r) => ({ label: 'Job photo', ref: r.media_path as string, kind: kindOf(r.media_kind) })));
  rows.forEach((r, i) => {
    const photo = photos[i];
    if (photo) out.set(r.id, photo);
  });
  return out;
}
