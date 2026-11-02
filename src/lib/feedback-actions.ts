'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from './data';
import { BOARD_STATUS } from './feedback';
import { staffGate } from './staff';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Writes for the feedback board. Each re-checks that the caller is an admin
 * with the people area, then calls a migration-136 function that checks again
 * and writes the audit log; nothing touches the tables directly.
 */

function friendly(message: string): string {
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  if (/does not exist|schema cache/i.test(message)) return 'This needs a database update that has not been applied yet: apply migration 136.';
  return message.replace(/^(error:\s*)/i, '');
}

async function call(fn: string, args: Record<string, unknown>): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(fn, args);
  return error ? friendly(error.message) : null;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

async function guard(): Promise<string | null> {
  await requireAdmin();
  return staffGate('people');
}

export async function setIdeaStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'postId');
  const status = str(form, 'status');
  if (!isUuid(id)) return { ok: false, message: 'That idea id looks wrong. Refresh the page.' };
  if (!BOARD_STATUS.some((s) => s.value === status)) return { ok: false, message: 'Choose a status.' };
  const err = await call('admin_feedback_set_status', { p_post: id, p_status: status, p_note: str(form, 'note').slice(0, 1000) || null });
  if (err) return { ok: false, message: err };
  revalidatePath('/feedback');
  const told = status === 'planned' || status === 'in_progress' || status === 'done';
  return { ok: true, message: told ? 'Updated. Everyone who backed it has been told.' : 'Updated.' };
}

export async function replyToIdea(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'postId');
  const body = str(form, 'body');
  if (!isUuid(id)) return { ok: false, message: 'That idea id looks wrong. Refresh the page.' };
  if (!body) return { ok: false, message: 'Write a reply first.' };
  const err = await call('admin_feedback_reply', { p_post: id, p_body: body.slice(0, 1000) });
  if (err) return { ok: false, message: err };
  revalidatePath('/feedback');
  return { ok: true, message: 'Posted as the TaskDrop team. The person who suggested it has been told.' };
}

export async function hideIdea(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'postId');
  const reason = str(form, 'reason');
  if (!isUuid(id)) return { ok: false, message: 'That idea id looks wrong. Refresh the page.' };
  if (!reason) return { ok: false, message: 'Say why you are hiding it.' };
  const err = await call('admin_feedback_hide', { p_post: id, p_hide: true, p_reason: reason.slice(0, 500) });
  if (err) return { ok: false, message: err };
  revalidatePath('/feedback');
  return { ok: true, message: 'Hidden. Nobody sees it on the board now; it is kept, so you can bring it back.' };
}

export async function unhideIdea(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'postId');
  if (!isUuid(id)) return { ok: false, message: 'That idea id looks wrong. Refresh the page.' };
  const err = await call('admin_feedback_hide', { p_post: id, p_hide: false });
  if (err) return { ok: false, message: err };
  revalidatePath('/feedback');
  return { ok: true, message: 'Back on the board.' };
}

export async function hideIdeaComment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'commentId');
  if (!isUuid(id)) return { ok: false, message: 'That comment id looks wrong. Refresh the page.' };
  const err = await call('admin_feedback_hide_comment', { p_comment: id, p_hide: true });
  if (err) return { ok: false, message: err };
  revalidatePath('/feedback');
  return { ok: true, message: 'Hidden from the board.' };
}

export async function showIdeaComment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'commentId');
  if (!isUuid(id)) return { ok: false, message: 'That comment id looks wrong. Refresh the page.' };
  const err = await call('admin_feedback_hide_comment', { p_comment: id, p_hide: false });
  if (err) return { ok: false, message: err };
  revalidatePath('/feedback');
  return { ok: true, message: 'Showing again.' };
}
