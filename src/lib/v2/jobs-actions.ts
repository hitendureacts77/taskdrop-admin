'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/components/ConfirmAction';
import { resolveDispute } from '../actions';
import { requireAdmin, isUuid } from '../data';
import { moneyMfaGate } from '../mfa';
import { staffGate } from '../staff';
import { createClient } from '../supabase/server';
import { inr } from '../format';

/**
 * Admin v2 WP2: decide a dispute from the v2 job page (the <Confirm> box, tier 3, word DECIDE).
 *
 *   worker / poster: today's resolveDispute (lib/actions.ts, unchanged), with the box's reason as its note.
 *   split:           admin_resolve_dispute_split (user repo migration 255). Plan B jobs only.
 *
 * Every path checks the role (money: Admin, Finance), the MFA gate and the reason here; the database
 * checks them again and writes the audit row (trigger on dispute_decisions).
 */
export async function decideDisputeV2(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('money');
  if (denied) return { ok: false, message: denied };
  const mfa = await moneyMfaGate();
  if (mfa) return { ok: false, message: mfa };

  const taskId = String(form.get('taskId') ?? '');
  const outcome = String(form.get('outcome') ?? '');
  const reason = String(form.get('reason') ?? '').trim();
  if (!isUuid(taskId)) return { ok: false, message: 'That job id looks wrong. Refresh the page.' };
  if (String(form.get('confirm_word') ?? '').trim().toUpperCase() !== 'DECIDE') return { ok: false, message: 'Type DECIDE to confirm.' };
  if (reason.length < 5) return { ok: false, message: 'Write the reason in a few words. Both people see it.' };

  if (outcome === 'worker' || outcome === 'poster') {
    const fd = new FormData();
    fd.set('taskId', taskId);
    fd.set('outcome', outcome);
    fd.set('note', reason.slice(0, 200));
    const r = await resolveDispute(null, fd);
    if (!r?.ok) return r;
    return {
      ok: true,
      message:
        outcome === 'worker'
          ? 'Decided for the worker. Their share is released to them and the job is finished.'
          : 'Decided for the poster. What they paid, service fee included, goes back to them and the job is cancelled.',
    };
  }
  if (outcome !== 'split') return { ok: false, message: 'Pick a decision first.' };

  const part = Number(String(form.get('part') ?? ''));
  if (!Number.isSafeInteger(part) || part <= 0) return { ok: false, message: 'Pick how much of the price the finished work is worth.' };

  const supabase = await createClient();
  // The RPC is newer than the generated types.
  const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc.call(supabase, 'admin_resolve_dispute_split', {
    p_task_id: taskId,
    p_worker_part_minor: part,
    p_note: reason.slice(0, 500),
  });
  if (error) return { ok: false, message: splitError(error.message) };

  revalidatePath('/disputes');
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath('/');
  return { ok: true, message: `Split decided. ${inr(part)} of the price counts as done; the rest goes back to the poster. Both people were told.` };
}

function splitError(message: string): string {
  if (/authenticator code/i.test(message)) return 'Enter your authenticator code on the Security page first, then try again.';
  if (/admins only|can't do this|can.t do this/i.test(message)) return 'Your role can’t decide money. Ask a full admin or finance.';
  if (/not disputed/i.test(message)) return 'Someone already decided this one. Refresh to see where it stands.';
  if (/could not find the function|does not exist/i.test(message)) return 'Split is not set up on this server yet. Pay the worker or refund the poster instead.';
  if (/pay per task|worker''?s part|reason|do not add up|No worker/i.test(message)) return message;
  return `The database said: ${message}`;
}
