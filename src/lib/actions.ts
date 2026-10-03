'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, isUuid } from './data';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * The only two places the panel moves money. Both go through the database's
 * own admin functions (which check private.is_admin() again and lock the row),
 * never through direct table writes, so a wallet is refunded or credited by the
 * same code path the scripts use.
 */

function friendly(message: string): string {
  if (/already (paid|failed|cancelled)/i.test(message)) return 'Someone already settled this one. Refresh to see where it stands.';
  if (/no longer exists/i.test(message)) return 'That no longer exists. Refresh the page.';
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  if (/only RazorpayX can settle/i.test(message)) {
    return 'RazorpayX already has this withdrawal, so only RazorpayX can settle it. Press “Check with RazorpayX” to get its latest status.';
  }
  if (/invalid input value for enum (assignment_status|cancelled_by|cancel_reason)|null value in column "phase"/i.test(message)) {
    return "The database's dispute function has a bug, so nothing was changed. Apply migration 066 (included with this update), then decide again.";
  }
  return `The database said: ${message}`;
}

export async function markPayout(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '');
  const name = String(form.get('name') ?? 'the worker').slice(0, 80);
  const amount = String(form.get('amount') ?? '').slice(0, 30);
  const note = String(form.get('note') ?? '').trim().slice(0, 200);

  if (!isUuid(id)) return { ok: false, message: 'That payout id looks wrong. Refresh the page.' };
  if (status !== 'processing' && status !== 'paid' && status !== 'failed') return { ok: false, message: 'Unknown action.' };
  if (status === 'paid' && !note) return { ok: false, message: 'Type the UPI or bank reference (UTR) so this transfer can be traced later.' };
  if (status === 'failed' && !note) return { ok: false, message: "Say why it didn't go through, so the worker can be told." };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_mark_payout', {
    p_payout_id: id,
    p_status: status,
    ...(note ? { p_note: note } : {}),
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath('/payouts');
  revalidatePath('/');
  revalidatePath('/money');
  const msg =
    status === 'paid'
      ? `Recorded: ${amount} sent to ${name}.`
      : status === 'failed'
        ? `${amount} is back in ${name}'s TaskDrop wallet. They can withdraw it again.`
        : `Marked as being sent. ${name} can no longer cancel it.`;
  return { ok: true, message: msg };
}

type Outcome = { id: string; status: string; providerStatus?: string | null; note?: string | null; retryLater?: boolean };

/**
 * "Check with RazorpayX": send every withdrawal that has not reached
 * RazorpayX yet (same idempotency key as before, so nothing goes twice), and
 * ask RazorpayX about the ones it has gone quiet on. The razorpayx-payouts
 * function checks admin again.
 */
export async function checkWithRazorpayX(_prev: ActionResult, _form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('razorpayx-payouts', { body: { action: 'check-all' } });
  if (error) return { ok: false, message: `Could not reach the payout service: ${error.message}` };
  if (data?.configured === false) {
    return { ok: false, message: 'RazorpayX is not set up yet. Add RAZORPAYX_ACCOUNT_NUMBER, the API keys and the webhook secret first.' };
  }
  const rows = (data?.payouts ?? []) as Outcome[];
  revalidatePath('/payouts');
  revalidatePath('/money');
  if (!rows.length) return { ok: true, message: 'Nothing is waiting: every withdrawal is settled.' };
  const paid = rows.filter((r) => r.status === 'paid').length;
  const back = rows.filter((r) => r.status === 'failed').length;
  const retry = rows.filter((r) => r.retryLater).length;
  const moving = rows.length - paid - back - retry;
  const parts = [
    paid ? `${paid} paid` : '',
    moving ? `${moving} on the way` : '',
    back ? `${back} came back to the worker’s earnings` : '',
    retry ? `${retry} got no answer from RazorpayX and will be tried again` : '',
  ].filter(Boolean);
  return { ok: retry === 0, message: `Checked ${rows.length}: ${parts.join(', ')}.` };
}

/**
 * Give a stuck withdrawal back to the worker. The function does it only if
 * RazorpayX confirms it has no payout for it; otherwise it records RazorpayX's
 * real status instead, so the worker can never be paid twice.
 */
export async function giveBackPayout(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get('id') ?? '');
  const name = String(form.get('name') ?? 'the worker').slice(0, 80);
  const amount = String(form.get('amount') ?? '').slice(0, 30);
  if (!isUuid(id)) return { ok: false, message: 'That payout id looks wrong. Refresh the page.' };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('razorpayx-payouts', { body: { action: 'give-back', payoutId: id } });
  if (error) return { ok: false, message: `Could not reach the payout service: ${error.message}` };
  if (data?.configured === false) return { ok: false, message: 'RazorpayX is not set up yet, so it cannot be asked about this withdrawal.' };
  const out = (data ?? {}) as Outcome;
  revalidatePath('/payouts');
  revalidatePath('/money');
  if (out.status === 'failed') return { ok: true, message: `${amount} is back in ${name}’s earnings. RazorpayX confirmed it never sent it.` };
  if (out.status === 'paid') return { ok: false, message: `RazorpayX already paid this one, so it was recorded as paid instead.` };
  if (out.retryLater) return { ok: false, message: `Nothing was changed. ${out.note ?? 'RazorpayX didn’t answer; try again shortly.'}` };
  return { ok: false, message: out.note ?? 'RazorpayX has this withdrawal, so its own status was recorded instead.' };
}

export async function resolveDispute(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const taskId = String(form.get('taskId') ?? '');
  const outcome = String(form.get('outcome') ?? '');
  const note = String(form.get('note') ?? '').trim().slice(0, 200);
  if (!isUuid(taskId)) return { ok: false, message: 'That job id looks wrong. Refresh the page.' };
  if (outcome !== 'worker' && outcome !== 'poster') return { ok: false, message: 'Unknown decision.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_resolve_dispute', {
    p_task_id: taskId,
    p_outcome: outcome,
    ...(note ? { p_note: note } : {}),
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath('/disputes');
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath('/');
  return {
    ok: true,
    message:
      outcome === 'worker'
        ? 'Decided for the worker. Their share is in their earnings and the job is finished.'
        : 'Decided for the poster. Everything they paid, service fee included, is back in their TaskDrop wallet. (An older job paid by card instead shows up in Refunds.)',
  };
}

/**
 * Send a cancelled job's escrow back to the poster through Razorpay. The
 * amount is worked out by the database (escrow_refund_due), the refund is made
 * by the razorpay edge function with the admin's own session, and it is only
 * written down after Razorpay accepts it -- the same path a poster's own
 * refund button takes.
 */
export async function sendRefund(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const taskId = String(form.get('taskId') ?? '');
  const poster = String(form.get('poster') ?? 'the poster').slice(0, 80);
  if (!isUuid(taskId)) return { ok: false, message: 'That job id looks wrong. Refresh the page.' };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('razorpay', { body: { action: 'refund-escrow', taskId } });
  if (error) {
    let detail = error.message;
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (ctx?.json) {
      try {
        const body = (await ctx.json()) as { error?: string };
        if (body?.error) detail = body.error;
      } catch {
        /* keep the generic message */
      }
    }
    return { ok: false, message: `Razorpay didn’t take the refund: ${detail}` };
  }
  const res = (data ?? {}) as { refundedMinor?: number; refundRef?: string | null; reason?: string };
  revalidatePath('/refunds');
  revalidatePath('/');
  if (!res.refundedMinor) return { ok: false, message: res.reason ?? 'Nothing was owed, so nothing was sent.' };
  const rupees = `₹${(res.refundedMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return {
    ok: true,
    message: `Razorpay accepted ${rupees} back to ${poster}${res.refundRef ? ` (ref ${res.refundRef})` : ''}. It usually reaches them in 5–7 working days.`,
  };
}

export async function replyTicket(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get('ticketId') ?? '');
  const body = String(form.get('body') ?? '').trim();
  if (!isUuid(id)) return { ok: false, message: 'That conversation id looks wrong.' };
  if (!body) return { ok: false, message: 'Write a reply first.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('reply_support_ticket', { p_ticket_id: id, p_body: body.slice(0, 4000) });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath(`/support/${id}`);
  revalidatePath('/support');
  return { ok: true, message: 'Reply sent. They get a notification.' };
}

export async function resolveTicket(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get('ticketId') ?? '');
  if (!isUuid(id)) return { ok: false, message: 'That conversation id looks wrong.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('resolve_support_ticket', { p_ticket_id: id });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath(`/support/${id}`);
  revalidatePath('/support');
  return { ok: true, message: 'Marked as resolved.' };
}

/**
 * The settings an admin may change from the panel, with the range each one must
 * stay in. Deliberately NOT here:
 *  - worker_commission_pct: the database re-reads it when clearing earnings
 *    settle, so changing it moves money on jobs that are already approved.
 *    Change it in a migration, when nothing is clearing.
 *  - dev_otp_for_all: a sign-in switch for every account; too dangerous for one click.
 */
const EDITABLE: Record<string, { kind: 'percent' | 'days' | 'count' | 'bool'; min?: number; max?: number }> = {
  poster_service_fee_pct: { kind: 'percent', min: 0, max: 20 },
  post_start_cancel_penalty_pct: { kind: 'percent', min: 0, max: 50 },
  review_window_days: { kind: 'days', min: 1, max: 30 },
  clearing_period_days: { kind: 'days', min: 0, max: 30 },
  max_video_seconds: { kind: 'count', min: 5, max: 600 },
};

export async function updateSetting(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const key = String(form.get('key') ?? '');
  const raw = String(form.get('value') ?? '').trim().replace('%', '');
  const rule = EDITABLE[key];
  if (!rule) return { ok: false, message: 'That setting can’t be changed from the panel.' };

  let value: number | boolean;
  if (rule.kind === 'bool') {
    const v = raw.toLowerCase();
    if (!['on', 'off', 'true', 'false', 'yes', 'no'].includes(v)) return { ok: false, message: 'Type On or Off.' };
    value = v === 'on' || v === 'true' || v === 'yes';
  } else {
    const n = Number(raw);
    if (!Number.isFinite(n)) return { ok: false, message: 'Type a number.' };
    if (rule.min !== undefined && n < rule.min) return { ok: false, message: `It can’t be below ${rule.min}.` };
    if (rule.max !== undefined && n > rule.max) return { ok: false, message: `It can’t be above ${rule.max}.` };
    if (rule.kind !== 'percent' && !Number.isInteger(n)) return { ok: false, message: 'Use a whole number.' };
    value = rule.kind === 'percent' ? Math.round(n * 100) / 10000 : n; // 10 (%) -> 0.1, as the database stores it
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select('key');
  if (error) return { ok: false, message: friendly(error.message) };
  // RLS turns a refused update into "0 rows" rather than an error; don't report that as saved.
  if (!data || (data as unknown[]).length === 0) return { ok: false, message: 'Nothing was saved: the database didn’t let this account change settings.' };
  revalidatePath('/settings');
  revalidatePath('/money');
  revalidatePath('/');
  return { ok: true, message: 'Saved. It applies from now on.' };
}
