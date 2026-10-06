'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, isUuid } from './data';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Every copyright-notice write. Each re-checks that the caller is an admin,
 * then calls a migration-085 function that checks again and writes the audit
 * log; nothing touches the table directly.
 */

function friendly(message: string): string {
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  if (/could not find the function|does not exist/i.test(message)) {
    return 'Copyright notices are not switched on in the database yet: apply migration 085, then try again.';
  }
  return message.replace(/^(error:\s*)/i, '');
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<{ error: string | null; data: T | null }> {
  const supabase = await createClient();
  // Newer than the generated types.
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: T | null; error: { message: string } | null }>)(fn, args);
  return { error: error ? friendly(error.message) : null, data };
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const UUID_IN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function done(message: string): ActionResult {
  revalidatePath('/copyright');
  return { ok: true, message };
}

export async function logNotice(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const complainant = str(form, 'complainant');
  const email = str(form, 'email');
  const work = str(form, 'work');
  const material = str(form, 'material');
  const job = str(form, 'job');
  const person = str(form, 'person');
  if (!complainant || !email || !work || !material) return { ok: false, message: 'Fill in who sent it, their email, the work, and where it is on TaskDrop.' };
  if (!/\S+@\S+\.\S+/.test(email)) return { ok: false, message: 'That email address looks wrong.' };
  // A link from the app (?task=…), from this panel (/tasks/…, /users/…), or a bare id.
  const taskId = job ? job.match(UUID_IN)?.[0] ?? null : null;
  if (job && !taskId) return { ok: false, message: 'Paste the job’s link or id, or leave it empty.' };
  const personId = person ? person.match(UUID_IN)?.[0] ?? null : null;
  if (person && !personId) return { ok: false, message: 'Paste the person’s People page link or id, or leave it empty.' };

  const r = await call<string>('admin_log_copyright_notice', {
    p_complainant: complainant.slice(0, 200),
    p_email: email.slice(0, 200),
    p_work: work.slice(0, 2000),
    p_material: material.slice(0, 2000),
    p_task: taskId,
    p_uploader: personId,
  });
  if (r.error) return { ok: false, message: r.error };
  return done('Notice logged. Check it has all six parts, then act on it below.');
}

export async function takeDown(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = str(form, 'id');
  const what = str(form, 'what');
  if (!isUuid(id)) return { ok: false, message: 'That notice id looks wrong. Refresh the page.' };
  if (what !== 'media' && what !== 'listing' && what !== 'avatar') return { ok: false, message: 'Unknown action.' };
  const r = await call('admin_copyright_takedown', { p_notice: id, p_what: what, p_note: str(form, 'note').slice(0, 1000) || null });
  if (r.error) return { ok: false, message: r.error };
  return done('Taken down, and the person who posted it has been told. Reply to the complainant to say it is done.');
}

export async function rejectNotice(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = str(form, 'id');
  const note = str(form, 'note');
  if (!isUuid(id)) return { ok: false, message: 'That notice id looks wrong. Refresh the page.' };
  if (!note) return { ok: false, message: 'Say why, so the next admin knows.' };
  const r = await call('admin_copyright_reject', { p_notice: id, p_note: note.slice(0, 1000) });
  if (r.error) return { ok: false, message: r.error };
  return done('Rejected. Reply to the sender saying what was missing.');
}

export async function recordCounter(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = str(form, 'id');
  if (!isUuid(id)) return { ok: false, message: 'That notice id looks wrong. Refresh the page.' };
  const r = await call<string>('admin_copyright_counter', { p_notice: id, p_note: str(form, 'note').slice(0, 1000) || null });
  if (r.error) return { ok: false, message: r.error };
  const from = r.data ? new Date(`${r.data}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'in 14 days';
  return done(`Recorded. Forward the counter-notice to the complainant today. You can restore it from ${from} unless they tell you they have gone to court.`);
}

export async function restoreNotice(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = str(form, 'id');
  if (!isUuid(id)) return { ok: false, message: 'That notice id looks wrong. Refresh the page.' };
  const r = await call('admin_copyright_restore', { p_notice: id });
  if (r.error) return { ok: false, message: r.error };
  return done('Restored, and the person who posted it has been told.');
}
