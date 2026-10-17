'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from './data';
import { staffGate } from './staff';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Writes for moderation and follow-ups. Each one re-checks that the caller is
 * an admin with the people area, then calls a database function that checks
 * again and records the action in the audit log.
 */

function friendly(message: string): string {
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  if (/does not exist|schema cache/i.test(message)) return 'This needs a database update that has not been applied yet.';
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

export async function resolveReport(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'reportId');
  const status = str(form, 'status');
  if (!isUuid(id)) return { ok: false, message: 'That report id looks wrong. Refresh the page.' };
  if (status !== 'actioned' && status !== 'dismissed') return { ok: false, message: 'Choose what to do with the report.' };
  const err = await call('admin_resolve_report', { p_report: id, p_status: status, p_note: str(form, 'note').slice(0, 500) || null });
  if (err) return { ok: false, message: err };
  revalidatePath('/reports-queue');
  return { ok: true, message: status === 'actioned' ? 'Marked as acted on.' : 'Dismissed.' };
}

export async function hideTask(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'taskId');
  const reason = str(form, 'reason');
  if (!isUuid(id)) return { ok: false, message: 'That job id looks wrong. Refresh the page.' };
  if (!reason) return { ok: false, message: 'Say why you are hiding it.' };
  const err = await call('admin_hide_task', { p_task: id, p_reason: reason.slice(0, 500) });
  if (err) return { ok: false, message: err };
  revalidatePath(`/tasks/${id}`);
  revalidatePath('/reports-queue');
  return { ok: true, message: 'Hidden. Only its poster and admins can see it now.' };
}

export async function unhideTask(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'taskId');
  if (!isUuid(id)) return { ok: false, message: 'That job id looks wrong. Refresh the page.' };
  const err = await call('admin_unhide_task', { p_task: id });
  if (err) return { ok: false, message: err };
  revalidatePath(`/tasks/${id}`);
  revalidatePath('/reports-queue');
  return { ok: true, message: 'Visible to everyone again.' };
}

export async function addFollowUp(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const title = str(form, 'title');
  const userId = str(form, 'userId');
  const owner = str(form, 'owner');
  const due = str(form, 'due');
  if (!title) return { ok: false, message: 'Write what needs doing.' };
  if (userId && !isUuid(userId)) return { ok: false, message: 'That person id looks wrong.' };
  if (owner && !isUuid(owner)) return { ok: false, message: 'That owner looks wrong.' };
  let dueAt: string | null = null;
  if (due) {
    // A date picked in the admin's browser means that day, Indian time, at 6 in the evening.
    const d = new Date(`${due}T18:00:00+05:30`);
    if (Number.isNaN(d.getTime())) return { ok: false, message: 'That due date is not valid.' };
    dueAt = d.toISOString();
  }
  const err = await call('crm_add_task', {
    p_title: title.slice(0, 200),
    p_user: userId || null,
    p_due: dueAt,
    p_owner: owner || null,
    p_detail: str(form, 'detail').slice(0, 2000) || null,
    p_task: null,
  });
  if (err) return { ok: false, message: err };
  revalidatePath('/crm/tasks');
  if (userId) revalidatePath(`/users/${userId}`);
  return { ok: true, message: 'Follow-up added.' };
}

export async function finishFollowUp(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'taskId');
  if (!isUuid(id)) return { ok: false, message: 'That follow-up id looks wrong. Refresh the page.' };
  const err = await call('crm_complete_task', { p_id: id, p_reopen: str(form, 'reopen') === '1' });
  if (err) return { ok: false, message: err };
  revalidatePath('/crm/tasks');
  return { ok: true, message: str(form, 'reopen') === '1' ? 'Reopened.' : 'Done.' };
}
