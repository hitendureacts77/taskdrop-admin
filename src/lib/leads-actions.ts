'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from './data';
import { asLeadStage, parseLeadInput } from './crm-calc';
import { staffGate } from './staff';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Writes for Leads. Each one re-checks that the caller is an admin with the
 * people area, then calls a database function that checks again (and says
 * "Your staff role (x) can't do this" if the role is not allowed).
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

export async function addLead(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('people');
  if (denied) return { ok: false, message: denied };
  const parsed = parseLeadInput({ name: str(form, 'name'), contact: str(form, 'contact'), kind: str(form, 'kind'), source: str(form, 'source'), note: str(form, 'note'), owner: str(form, 'owner') });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const v = parsed.value;
  const err = await call('crm_add_lead', { p_name: v.name, p_contact: v.contact, p_kind: v.kind, p_source: v.source, p_note: v.note, p_owner: v.owner });
  if (err) return { ok: false, message: err };
  revalidatePath('/crm/leads');
  return { ok: true, message: `Added ${v.name}.` };
}

/** Change a lead's stage, note and owner together. An empty owner takes the owner off. */
export async function updateLead(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('people');
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'leadId');
  const stage = asLeadStage(str(form, 'stage'));
  const owner = str(form, 'owner');
  const note = str(form, 'note');
  if (!isUuid(id)) return { ok: false, message: 'That lead id looks wrong. Refresh the page.' };
  if (!stage) return { ok: false, message: 'Choose a stage.' };
  if (owner && !isUuid(owner)) return { ok: false, message: 'That owner id looks wrong. Refresh the page.' };
  if (note.length > 2000) return { ok: false, message: 'Keep the note to 2000 characters.' };
  const err = await call('crm_update_lead', { p_id: id, p_stage: stage, p_note: note, p_owner: owner || null, p_clear_owner: !owner });
  if (err) return { ok: false, message: err };
  revalidatePath('/crm/leads');
  return { ok: true, message: 'Saved.' };
}
