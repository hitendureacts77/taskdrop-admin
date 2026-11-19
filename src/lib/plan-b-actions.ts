'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, isUuid } from './data';
import { moneyMfaGate } from './mfa';
import { createClient } from './supabase/server';
import { staffGate } from './staff';
import { isPlanBMissing } from './plan-b-calc';
import type { ActionResult } from '@/components/ConfirmAction';

/** The server's own plain-words refusal is shown as it is; only a missing function gets a calmer sentence. */
function say(message: string, code?: string | null): string {
  if (isPlanBMissing(message, code)) return 'Plan B is not set up on this database yet.';
  return message;
}

/** The Money stop. Full admin only: the database checks the role and the authenticator too. */
export async function setMoneyPaused(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
  const mfa = await moneyMfaGate();
  if (mfa) return { ok: false, message: mfa };
  const pause = String(form.get('pause') ?? '') === '1';
  const reason = String(form.get('reason') ?? '').trim().slice(0, 200);
  if (!reason) return { ok: false, message: pause ? 'Say why you are pausing payments.' : 'Say why you are resuming payments.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_money_paused' as never, { p_paused: pause, p_reason: reason } as never);
  if (error) return { ok: false, message: say(error.message, error.code) };
  revalidatePath('/money/plan-b');
  return { ok: true, message: pause ? 'Payments and releases are paused. Refunds keep working.' : 'Payments and releases are running again.' };
}

/** Send a failed release or refund again (money staff). */
export async function retryPlanBMove(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('money');
  if (denied) return { ok: false, message: denied };
  const mfa = await moneyMfaGate();
  if (mfa) return { ok: false, message: mfa };
  const holdId = String(form.get('holdId') ?? '');
  const reason = String(form.get('reason') ?? '').trim().slice(0, 200);
  if (!isUuid(holdId)) return { ok: false, message: 'That hold id looks wrong. Refresh the page.' };
  if (!reason) return { ok: false, message: 'Say why you are trying this again.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_plan_b_retry_move' as never, { p_hold_id: holdId, p_reason: reason } as never);
  if (error) return { ok: false, message: say(error.message, error.code) };
  revalidatePath('/money/plan-b');
  return { ok: true, message: typeof data === 'string' && data ? data : 'Sent again. Check back in a minute.' };
}
