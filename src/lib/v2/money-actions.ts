'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from '../data';
import { moneyMfaGate } from '../mfa';
import { staffGate } from '../staff';
import { createClient } from '../supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Admin v2 money actions (WP1). Same front door as lib/actions.ts: signed-in admin, a staff role that may
 * handle money, the money MFA gate (passes while MFA is off). The database functions check all of it again
 * and write the audit row; the v2 Confirm box is only UI.
 */

const NOT_THERE = /does not exist|could not find the function|schema cache|PGRST202|42883/i;

function plain(message: string): string {
  if (/authenticator code/i.test(message)) return 'Enter your authenticator code on the Security page first, then try again.';
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  if (/staff role/i.test(message)) return message;
  if (/not waiting for a retry/i.test(message)) return 'That move is no longer waiting for a retry. Refresh to see where it stands.';
  return `The database said: ${message}`;
}

async function moneyFrontDoor(): Promise<string | null> {
  await requireAdmin();
  const denied = await staffGate('money');
  if (denied) return denied;
  return moneyMfaGate();
}

/** Money check: "Mark explained". Writes a note (migration 250); the line leaves the list. Moves no money. */
export async function markMoneyCheckExplained(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const stop = await moneyFrontDoor();
  if (stop) return { ok: false, message: stop };
  const code = String(form.get('code') ?? '');
  const refType = String(form.get('refType') ?? '');
  const refId = String(form.get('refId') ?? '');
  const at = String(form.get('at') ?? '');
  const note = String(form.get('reason') ?? '').trim().slice(0, 500);
  if (!/^[a-z0-9_]{1,60}$/.test(code) || !/^[a-z0-9_]{0,40}$/.test(refType)) return { ok: false, message: 'That line looks wrong. Refresh the page.' };
  if (note.length < 3) return { ok: false, message: 'Write what happened (a few words).' };
  const atOk = at && !Number.isNaN(Date.parse(at));
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_mark_money_check_explained' as never, {
    p_check_code: code,
    p_ref_type: refType,
    p_ref_id: isUuid(refId) ? refId : null,
    p_at: atOk ? new Date(at).toISOString() : null,
    p_note: note,
  } as never);
  if (error) {
    if (NOT_THERE.test(`${error.code ?? ''} ${error.message}`)) return { ok: false, message: 'Not set up on this server yet.' };
    return { ok: false, message: plain(error.message) };
  }
  revalidatePath('/money/reconcile');
  return { ok: true, message: 'Marked explained. The note is in the audit log.' };
}

/** Pay per task: send a failed release or refund to Razorpay again (same key, so never twice). */
export async function retryPlanBMove(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const stop = await moneyFrontDoor();
  if (stop) return { ok: false, message: stop };
  const holdId = String(form.get('holdId') ?? '');
  const reason = String(form.get('reason') ?? '').trim().slice(0, 300);
  if (!isUuid(holdId)) return { ok: false, message: 'That move id looks wrong. Refresh the page.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_plan_b_retry_move' as never, { p_hold_id: holdId, p_reason: reason || 'retried from the admin' } as never);
  if (error) {
    if (NOT_THERE.test(`${error.code ?? ''} ${error.message}`)) return { ok: false, message: 'Not set up on this server yet.' };
    return { ok: false, message: plain(error.message) };
  }
  revalidatePath('/money');
  const what = String(data ?? '').startsWith('refund') ? 'refund' : String(data ?? '').startsWith('split') ? 'split' : 'release';
  return { ok: true, message: `Sent again: the ${what} goes out on the next run. It stays in the list if it fails again.` };
}
