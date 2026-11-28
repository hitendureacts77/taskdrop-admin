'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActionResult } from '@/components/ConfirmAction';
import { scopeAlerts } from '../alerts';
import { recordCounter, rejectNotice, takeDown } from '../copyright-actions';
import { isUuid, requireAdmin } from '../data';
import { resolveReport } from '../growth-actions';
import { roleLabel, staffCanMarkAlerts, staffCanSee } from '../staff-roles';
import { staffGate } from '../staff';
import { createClient } from '../supabase/server';
import { getHideTestData } from '../v2-gate-server';

/**
 * Admin v2 (WP5) writes for Help & safety. The v2 confirm box sends its text
 * box as `reason`; today's report and copyright actions read `note`. These
 * wrappers check the caller first, copy `reason` into `note`, and hand over to
 * today's action, which checks the role again and writes the audit log through
 * its database function. Nothing here touches a table except the team alert
 * read time, which is the same update today's markAlertsRead makes.
 */

async function peopleGuard(): Promise<string | null> {
  await requireAdmin();
  return staffGate('people');
}

function withNote(form: FormData): FormData {
  const out = new FormData();
  for (const [k, v] of form.entries()) if (k !== 'note') out.append(k, v);
  out.set('note', String(form.get('reason') ?? '').trim());
  return out;
}

/** Mark acted on / Dismiss a flagged item, with an optional note. */
export async function resolveReportV2(prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await peopleGuard();
  if (denied) return { ok: false, message: denied };
  return resolveReport(prev, withNote(form));
}

/** Copyright: take down the job's photo, close the post, or take down a profile photo (note optional). */
export async function takeDownV2(prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await peopleGuard();
  if (denied) return { ok: false, message: denied };
  return takeDown(prev, withNote(form));
}

/** Copyright: reject a notice (reason required). */
export async function rejectNoticeV2(prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await peopleGuard();
  if (denied) return { ok: false, message: denied };
  return rejectNotice(prev, withNote(form));
}

/** Copyright: record a counter-notice (note optional). */
export async function recordCounterV2(prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await peopleGuard();
  if (denied) return { ok: false, message: denied };
  return recordCounter(prev, withNote(form));
}

/**
 * Marks team alerts read: `ids` (one alert, or a grouped set, comma separated,
 * at most 100) or `ids=all`. "All" covers only what this person's list shows:
 * Sales never marks money alerts it cannot see, and "Hide test data" is
 * respected. The read time is one value for the whole team, so Viewer may not
 * change it (same rule as today's action).
 */
export async function markAlertsReadV2(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!staffCanMarkAlerts(me.staffRole)) {
    return { ok: false, message: `Your staff role (${roleLabel(me.staffRole)}) can’t do this. Ask a full admin.` };
  }
  const raw = String(form.get('ids') ?? '').trim();
  const all = raw === 'all';
  const ids = all ? [] : [...new Set(raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (!all && (ids.length === 0 || ids.length > 100 || !ids.every(isUuid))) return { ok: false, message: 'That alert id looks wrong. Refresh the page.' };

  const supabase = (await createClient()) as unknown as SupabaseClient;
  const scoped = scopeAlerts(supabase.from('admin_alerts').update({ read_at: new Date().toISOString() }, { count: 'exact' }), {
    seesMoney: staffCanSee(me.staffRole, 'money'),
    hideTest: all ? await getHideTestData() : false,
  }).is('read_at', null);
  const { error, count } = all ? await scoped : await scoped.in('id', ids);
  if (error) return { ok: false, message: error.message.replace(/^(error:\s*)/i, '') };
  revalidatePath('/alerts');
  if (!count) return { ok: false, message: all ? 'There were no unread alerts you can see.' : 'Already read.' };
  return { ok: true, message: all ? `${count.toLocaleString('en-IN')} alert${count === 1 ? '' : 's'} marked as read for the whole team.` : count === 1 ? 'Marked as read.' : `${count} alerts marked as read.` };
}
