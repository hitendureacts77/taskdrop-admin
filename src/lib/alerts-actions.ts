'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from './data';
import { roleLabel, staffCanMarkAlerts } from './staff-roles';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Marks team alerts as read. Only the read time can be changed (the database
 * grants nothing else), and only admins can see the rows at all.
 *
 * The read time is one value for the whole team, so a view-only role may not
 * change it (B124); and when nothing the caller can see was unread, it says so
 * instead of "marked as read". A read state per staff member needs a migration.
 */
export async function markAlertsRead(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!staffCanMarkAlerts(me.staffRole)) {
    return { ok: false, message: `Your staff role (${roleLabel(me.staffRole)}) can’t do this. Ask a full admin.` };
  }
  const id = String(form.get('alertId') ?? '').trim();
  if (id !== 'all' && !isUuid(id)) return { ok: false, message: 'That alert id looks wrong. Refresh the page.' };
  const supabase = await createClient();
  const q = supabase.from('admin_alerts').update({ read_at: new Date().toISOString() }, { count: 'exact' }).is('read_at', null);
  const { error, count } = id === 'all' ? await q : await q.eq('id', id);
  if (error) return { ok: false, message: error.message.replace(/^(error:\s*)/i, '') };
  revalidatePath('/alerts');
  if (count === 0) return { ok: false, message: id === 'all' ? 'There were no unread alerts you can see.' : 'That alert was already read.' };
  return { ok: true, message: id === 'all' ? 'All alerts marked as read.' : 'Marked as read.' };
}
