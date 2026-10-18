'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from './data';
import { parseRuleInput } from './crm-calc';
import { staffGate } from './staff';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Writes for the automation rules. Full admins only: the panel checks the
 * staff role first to say so plainly, and the database functions check again.
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

/** Add a rule (no id) or change one (with an id). New rules start switched off unless `enabled` says otherwise. */
export async function saveRule(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
  const parsed = parseRuleInput({ id: str(form, 'id'), name: str(form, 'name'), kind: str(form, 'kind'), days: str(form, 'days'), enabled: str(form, 'enabled') });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const v = parsed.value;
  const err = await call('admin_save_crm_rule', { p_id: v.id, p_name: v.name, p_kind: v.kind, p_days: v.days, p_enabled: v.enabled });
  if (err) return { ok: false, message: err };
  revalidatePath('/settings/rules');
  return { ok: true, message: v.id ? 'Rule saved.' : 'Rule added. It is switched off until you turn it on.' };
}

/** Switch a rule on or off, keeping its name, kind and days as they are. */
export async function setRuleEnabled(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'id');
  if (!isUuid(id)) return { ok: false, message: 'That rule id looks wrong. Refresh the page.' };
  const parsed = parseRuleInput({ id, name: str(form, 'name'), kind: str(form, 'kind'), days: str(form, 'days'), enabled: str(form, 'enabled') });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const v = parsed.value;
  const err = await call('admin_save_crm_rule', { p_id: id, p_name: v.name, p_kind: v.kind, p_days: v.days, p_enabled: v.enabled });
  if (err) return { ok: false, message: err };
  revalidatePath('/settings/rules');
  return { ok: true, message: v.enabled ? 'Switched on. It is checked every 3 hours.' : 'Switched off. No new follow-ups from this rule.' };
}

export async function deleteRule(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'id');
  if (!isUuid(id)) return { ok: false, message: 'That rule id looks wrong. Refresh the page.' };
  const err = await call('admin_delete_crm_rule', { p_id: id });
  if (err) return { ok: false, message: err };
  revalidatePath('/settings/rules');
  return { ok: true, message: 'Rule deleted.' };
}
