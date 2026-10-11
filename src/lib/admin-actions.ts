'use server';

import { revalidatePath } from 'next/cache';
import { isAllowedIdentity } from './auth';
import { SWITCH_KEYS, type SwitchKey } from './admin-config';
import { isUuid, requireAdmin } from './data';
import { moneyMfaGate } from './mfa';
import { createClient } from './supabase/server';
import { createClient as createServiceClient } from './supabase/service';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Writes for Admin & configuration. Admin access goes through admin_set_admin
 * (migration 024), which checks private.is_admin() again, refuses removing
 * yourself, and -- like every settings write -- needs an authenticator code
 * (migration 080). The panel checks the code first so it can say what to do.
 */

function friendly(message: string): string {
  if (/authenticator code|aal2/i.test(message)) return 'Enter your authenticator code on the Security page first, then try again.';
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  if (/cannot remove your own/i.test(message)) return 'You can’t remove your own admin access. Ask another admin to do it.';
  return `The database said: ${message}`;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function revalidateTeam() {
  revalidatePath('/settings', 'layout');
  revalidatePath('/users');
}

/** "@asha", "asha" or a person id. */
async function findPerson(who: string): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();
  const clean = who.replace(/^@/, '').trim();
  if (!clean) return null;
  const q = supabase.from('profiles').select('id, display_name').is('deleted_at', null);
  const { data } = isUuid(clean) ? await q.eq('id', clean).maybeSingle() : await q.ilike('username', clean.replace(/[%_\\]/g, '')).maybeSingle();
  const p = data as { id: string; display_name: string } | null;
  return p ? { id: p.id, name: p.display_name || 'this person' } : null;
}

export async function addAdmin(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const mfa = await moneyMfaGate();
  if (mfa) return { ok: false, message: mfa };
  const who = str(form, 'who').slice(0, 80);
  if (!who) return { ok: false, message: 'Type their @username, as shown on their profile.' };
  const person = await findPerson(who);
  if (!person) return { ok: false, message: `Nobody in TaskDrop has the username “${who.replace(/^@/, '')}”. Check it on the People page.` };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_admin', { p_user_id: person.id, p_on: true });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidateTeam();

  // The database role is in; say plainly whether the panel's allowlist will still turn them away.
  let blocked = false;
  try {
    const { data } = await createServiceClient().auth.admin.getUserById(person.id);
    blocked = !isAllowedIdentity(data?.user?.email ?? null);
  } catch {
    // No service key: the team table shows "unknown" instead.
  }
  return {
    ok: true,
    message: blocked
      ? `${person.name} is now an admin in the database, but this panel only lets in the account in ADMIN_EMAIL / ADMIN_PHONE. Add theirs there for them to sign in.`
      : `${person.name} is now an admin.`,
  };
}

export async function removeAdmin(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const mfa = await moneyMfaGate();
  if (mfa) return { ok: false, message: mfa };
  const id = str(form, 'userId');
  if (!isUuid(id)) return { ok: false, message: 'That person id looks wrong. Refresh the page.' };
  if (id === me.id) return { ok: false, message: 'You can’t remove your own admin access. Ask another admin to do it.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_admin', { p_user_id: id, p_on: false });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidateTeam();
  return { ok: true, message: 'Removed. They lose the panel on their next page load.' };
}

/**
 * Flip one of the app-wide switches. Turning the developer sign-in switch ON
 * lets any phone number in with an auto-filled code, so that direction needs
 * the word ON typed as well.
 */
export async function setSwitch(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const mfa = await moneyMfaGate();
  if (mfa) return { ok: false, message: mfa };
  const key = str(form, 'key') as SwitchKey;
  if (!SWITCH_KEYS.includes(key)) return { ok: false, message: 'That switch can’t be changed from the panel.' };
  const on = str(form, 'on') === 'true';
  if (key === 'dev_otp_for_all' && on && str(form, 'confirm').toUpperCase() !== 'ON') {
    return { ok: false, message: 'Type ON to confirm. This lets anyone sign in to any phone number.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('settings')
    .upsert({ key, value: on, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select('key');
  if (error) return { ok: false, message: friendly(error.message) };
  // RLS turns a refused write into "0 rows" rather than an error; don't report that as saved.
  if (!data || (data as unknown[]).length === 0) return { ok: false, message: 'Nothing was saved: the database didn’t let this account change settings.' };
  revalidatePath('/settings', 'layout');
  revalidatePath('/security');
  return { ok: true, message: on ? 'Switched on.' : 'Switched off.' };
}
