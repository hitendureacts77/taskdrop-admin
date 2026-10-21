'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from './data';
import { staffGate } from './staff';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Ends every session of one person (lost phone, shared device). The database
 * function admin_sign_out_everywhere checks the role again, needs a reason,
 * refuses yourself, and writes the audit log.
 */
export async function signOutEverywhere(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
  const userId = String(form.get('userId') ?? '').trim();
  const name = String(form.get('name') ?? '').trim().slice(0, 80) || 'They';
  const reason = String(form.get('reason') ?? '').trim();
  if (!isUuid(userId)) return { ok: false, message: 'That person id looks wrong. Refresh the page.' };
  if (!reason) return { ok: false, message: 'Say why, so the next admin knows.' };
  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(
    'admin_sign_out_everywhere',
    { p_user: userId, p_reason: reason.slice(0, 200) },
  );
  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) return { ok: false, message: 'This needs a database update that has not been applied yet.' };
    return { ok: false, message: error.message.replace(/^(error:\s*)/i, '') };
  }
  revalidatePath(`/users/${userId}`);
  const n = Number(data ?? 0);
  return { ok: true, message: `${name} is signed out of ${n} ${n === 1 ? 'session' : 'sessions'}. They can sign in again; a phone or browser that is open may keep working for up to an hour.` };
}
