'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, isUuid } from './data';
import { createClient } from './supabase/server';
import { parseCriteria, type Criteria } from './crm';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Every CRM write. Each one re-checks that the caller is an admin, then calls a
 * database function that checks again; nothing writes to a CRM table directly.
 */

function friendly(message: string): string {
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  return message.replace(/^(error:\s*)/i, '');
}

async function call(fn: string, args: Record<string, unknown>): Promise<{ error: string | null; data: unknown }> {
  const supabase = await createClient();
  // The CRM functions are newer than the generated types.
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);
  return { error: error ? friendly(error.message) : null, data };
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

// ----------------------------------------------------------------- notes --

export async function addNote(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = str(form, 'userId');
  const body = str(form, 'body');
  const due = str(form, 'followUp');
  if (!isUuid(userId)) return { ok: false, message: 'That person id looks wrong. Refresh the page.' };
  if (!body) return { ok: false, message: 'Write the note first.' };
  let followUp: string | null = null;
  if (due) {
    // A date picked in the admin's browser means that day, Indian time, at 9 in the morning.
    const d = new Date(`${due}T09:00:00+05:30`);
    if (Number.isNaN(d.getTime())) return { ok: false, message: 'That follow-up date is not valid.' };
    followUp = d.toISOString();
  }
  const r = await call('crm_add_note', { p_user: userId, p_body: body.slice(0, 4000), p_follow_up: followUp });
  if (r.error) return { ok: false, message: r.error };
  revalidatePath(`/users/${userId}`);
  revalidatePath('/crm');
  return { ok: true, message: followUp ? 'Note saved, with a follow-up reminder.' : 'Note saved.' };
}

export async function updateNote(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = str(form, 'noteId');
  const userId = str(form, 'userId');
  const what = str(form, 'what');
  if (!isUuid(id)) return { ok: false, message: 'That note id looks wrong. Refresh the page.' };
  const args: Record<string, unknown> = { p_note: id };
  if (what === 'pin') args.p_pinned = true;
  else if (what === 'unpin') args.p_pinned = false;
  else if (what === 'done') args.p_done = true;
  else if (what === 'reopen') args.p_done = false;
  else return { ok: false, message: 'Unknown action.' };
  const r = await call('crm_update_note', args);
  if (r.error) return { ok: false, message: r.error };
  if (isUuid(userId)) revalidatePath(`/users/${userId}`);
  revalidatePath('/crm');
  return { ok: true, message: 'Updated.' };
}

export async function deleteNote(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = str(form, 'noteId');
  const userId = str(form, 'userId');
  if (!isUuid(id)) return { ok: false, message: 'That note id looks wrong. Refresh the page.' };
  const r = await call('crm_delete_note', { p_note: id });
  if (r.error) return { ok: false, message: r.error };
  if (isUuid(userId)) revalidatePath(`/users/${userId}`);
  revalidatePath('/crm');
  return { ok: true, message: 'Note deleted.' };
}

// ------------------------------------------------------------------ tags --

export async function assignTag(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = str(form, 'userId');
  const name = str(form, 'name');
  if (!isUuid(userId)) return { ok: false, message: 'That person id looks wrong. Refresh the page.' };
  if (!name) return { ok: false, message: 'Type a tag name.' };
  const r = await call('crm_assign_tag', { p_user: userId, p_name: name.slice(0, 30) });
  if (r.error) return { ok: false, message: r.error };
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
  revalidatePath('/crm');
  return { ok: true, message: `Tagged “${name}”.` };
}

export async function removeTag(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = str(form, 'userId');
  const tagId = str(form, 'tagId');
  if (!isUuid(userId) || !isUuid(tagId)) return { ok: false, message: 'That id looks wrong. Refresh the page.' };
  const r = await call('crm_remove_tag', { p_user: userId, p_tag: tagId });
  if (r.error) return { ok: false, message: r.error };
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
  revalidatePath('/crm');
  return { ok: true, message: 'Tag removed.' };
}

export async function deleteTag(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const tagId = str(form, 'tagId');
  if (!isUuid(tagId)) return { ok: false, message: 'That tag id looks wrong. Refresh the page.' };
  const r = await call('crm_delete_tag', { p_tag: tagId });
  if (r.error) return { ok: false, message: r.error };
  revalidatePath('/crm');
  revalidatePath('/users');
  return { ok: true, message: 'Tag deleted from everyone.' };
}

// ------------------------------------------------------------ suspension --

export async function suspendUser(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = str(form, 'userId');
  const name = str(form, 'name').slice(0, 80) || 'They';
  const reason = str(form, 'reason');
  if (!isUuid(userId)) return { ok: false, message: 'That person id looks wrong. Refresh the page.' };
  if (!reason) return { ok: false, message: 'Say why, so the next admin knows.' };
  const r = await call('crm_suspend_user', { p_user: userId, p_reason: reason.slice(0, 500) });
  if (r.error) return { ok: false, message: r.error };
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
  revalidatePath('/crm');
  return { ok: true, message: `${name} is suspended. They are signed out and cannot sign in or withdraw.` };
}

export async function unsuspendUser(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = str(form, 'userId');
  const name = str(form, 'name').slice(0, 80) || 'They';
  const note = str(form, 'note');
  if (!isUuid(userId)) return { ok: false, message: 'That person id looks wrong. Refresh the page.' };
  const r = await call('crm_unsuspend_user', { p_user: userId, p_note: note ? note.slice(0, 500) : null });
  if (r.error) return { ok: false, message: r.error };
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
  revalidatePath('/crm');
  return { ok: true, message: `${name} can sign in again, and has been told.` };
}

// -------------------------------------------------------------- segments --

function criteriaFrom(form: FormData): Criteria {
  const raw = str(form, 'query');
  return parseCriteria(Object.fromEntries(new URLSearchParams(raw)));
}

export async function saveSegment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = str(form, 'name');
  const criteria = criteriaFrom(form);
  if (!name) return { ok: false, message: 'Give the segment a name.' };
  const r = await call('crm_save_segment', { p_name: name.slice(0, 60), p_criteria: criteria });
  if (r.error) return { ok: false, message: r.error };
  revalidatePath('/crm/segments');
  revalidatePath('/crm/messages');
  return { ok: true, message: `Saved as “${name}”. It updates itself as people change.` };
}

export async function deleteSegment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = str(form, 'segmentId');
  if (!isUuid(id)) return { ok: false, message: 'That segment id looks wrong. Refresh the page.' };
  const r = await call('crm_delete_segment', { p_id: id });
  if (r.error) return { ok: false, message: r.error };
  revalidatePath('/crm/segments');
  revalidatePath('/crm/messages');
  return { ok: true, message: 'Segment deleted.' };
}

// -------------------------------------------------------------- messages --

/**
 * One message to one person or to an audience. The audience is worked out here
 * from its key, never taken from the browser as a list of people.
 */
export async function sendBroadcast(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const title = str(form, 'title');
  const body = str(form, 'body');
  const audience = str(form, 'audience');
  const label = str(form, 'label').slice(0, 120);
  if (!title) return { ok: false, message: 'Write a title: it is the first line they see.' };
  if (title.length > 80) return { ok: false, message: 'Keep the title to 80 characters.' };
  if (!body) return { ok: false, message: 'Write the message.' };
  if (body.length > 500) return { ok: false, message: 'Keep the message to 500 characters.' };

  const args: Record<string, unknown> = { p_title: title, p_body: body, p_label: label || null };
  if (audience.startsWith('user:')) {
    const id = audience.slice(5);
    if (!isUuid(id)) return { ok: false, message: 'That person id looks wrong. Refresh the page.' };
    args.p_user = id;
  } else if (audience === 'all') {
    args.p_criteria = {};
  } else if (audience === 'workers') {
    args.p_criteria = { role: 'worker' };
  } else if (audience === 'posters') {
    args.p_criteria = { role: 'poster' };
  } else if (audience.startsWith('tag:')) {
    const id = audience.slice(4);
    if (!isUuid(id)) return { ok: false, message: 'That tag id looks wrong. Refresh the page.' };
    args.p_criteria = { tag_id: id };
  } else if (audience === 'filters') {
    args.p_criteria = criteriaFrom(form);
  } else if (audience.startsWith('segment:')) {
    const id = audience.slice(8);
    if (!isUuid(id)) return { ok: false, message: 'That segment id looks wrong. Refresh the page.' };
    const supabase = await createClient();
    const { data } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { criteria: Criteria } | null }> } } } })
      .from('crm_segments')
      .select('criteria')
      .eq('id', id)
      .maybeSingle();
    if (!data) return { ok: false, message: 'That segment no longer exists. Refresh the page.' };
    args.p_criteria = data.criteria;
  } else {
    return { ok: false, message: 'Choose who this goes to.' };
  }

  const r = await call('crm_send_broadcast', args);
  if (r.error) return { ok: false, message: r.error };
  const n = Number(r.data);
  revalidatePath('/crm');
  revalidatePath('/crm/messages');
  if (args.p_user) revalidatePath(`/users/${args.p_user}`);
  return { ok: true, message: `Sent to ${n.toLocaleString('en-IN')} ${n === 1 ? 'person' : 'people'}. It is in their notifications, and phones with the app get a push.` };
}
