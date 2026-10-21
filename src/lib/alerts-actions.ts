'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from './data';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Marks team alerts as read. Only the read time can be changed (the database
 * grants nothing else), and only admins can see the rows at all.
 */
export async function markAlertsRead(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get('alertId') ?? '').trim();
  if (id !== 'all' && !isUuid(id)) return { ok: false, message: 'That alert id looks wrong. Refresh the page.' };
  const supabase = await createClient();
  const q = supabase.from('admin_alerts').update({ read_at: new Date().toISOString() }).is('read_at', null);
  const { error } = id === 'all' ? await q : await q.eq('id', id);
  if (error) return { ok: false, message: error.message.replace(/^(error:\s*)/i, '') };
  revalidatePath('/alerts');
  return { ok: true, message: id === 'all' ? 'All alerts marked as read.' : 'Marked as read.' };
}
