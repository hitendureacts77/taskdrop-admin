'use server';

import { revalidatePath } from 'next/cache';
import { isAllowedIdentity } from './auth';
import { classifyWho } from './find-person';
import { SWITCH_KEYS, type SwitchKey } from './admin-config';
import { isUuid, requireAdmin } from './data';
import { moneyMfaGate } from './mfa';
import { staffGate } from './staff';
import { STAFF_ROLES, roleLabel, type StaffRole } from './staff-roles';
import { createClient } from './supabase/server';
import { createClient as createServiceClient } from './supabase/service';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Writes for Admin & configuration. Admin access goes through admin_set_admin
 * (migration 024), which checks private.is_admin() again, refuses removing
 * yourself, and -- like every settings write -- needs an authenticator code
 * (migration 080). The panel checks the code first so it can say what to do.
 * Staff roles and alerts go through admin_set_staff (migration 089).
 */

function friendly(message: string): string {
  if (/authenticator code|aal2/i.test(message)) return 'Enter your authenticator code on the Security page first, then try again.';
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  if (/cannot remove your own/i.test(message)) return 'You can’t remove your own admin access. Ask another admin to do it.';
  if (/own staff role/i.test(message)) return 'You can’t change your own role. Ask another full admin.';
  if (/last full admin/i.test(message)) return 'This is the last full Admin. Make someone else a full Admin first.';
  if (/staff role/i.test(message)) return message.replace(/^(error:s*)/i, '');
  if (/admin_staff|admin_set_staff/i.test(message)) return 'Staff roles need migration 089 in the database first.';
  return `The database said: ${message}`;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

const isStaffRole = (v: string): v is StaffRole => STAFF_ROLES.some((r) => r.value === v);

/** admin_set_staff is newer than the generated types. */
async function setStaff(userId: string, role: StaffRole, notify: boolean | null): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(
    'admin_set_staff',
    { p_user_id: userId, p_role: role, p_notify: notify },
  );
  return error ? friendly(error.message) : null;
}

function revalidateTeam() {
  revalidatePath('/settings', 'layout');
  revalidatePath('/users');
}

/**
 * Looks up the auth user behind an e-mail address. Server only: auth.users is
 * not readable with the admin's own session, so this uses the service key
 * (read-only; the caller has already passed requireAdmin). Someone who has only
 * signed in with Google has an e-mail but no phone or @username.
 */
async function findIdByEmail(email: string): Promise<string | null> {
  let service;
  try {
    service = createServiceClient();
  } catch {
    return null;
  }
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < perPage) break;
  }
  return null;
}

/** "@asha", "asha", an e-mail address (Google sign-in) or a person id. */
async function findPerson(who: string): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();
  const w = classifyWho(who);
  if (!w) return null;
  const q = supabase.from('profiles').select('id, display_name').is('deleted_at', null);
  let data: unknown;
  if (w.kind === 'uuid') ({ data } = await q.eq('id', w.value).maybeSingle());
  else if (w.kind === 'username') ({ data } = await q.ilike('username', w.value.replace(/[%_\\]/g, '')).maybeSingle());
  else {
    const id = await findIdByEmail(w.value);
    if (!id) return null;
    ({ data } = await q.eq('id', id).maybeSingle());
  }
  const p = data as { id: string; display_name: string } | null;
  return p ? { id: p.id, name: p.display_name || 'this person' } : null;
}

export async function addAdmin(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
  const mfa = await moneyMfaGate();
  if (mfa) return { ok: false, message: mfa };
  const who = str(form, 'who').slice(0, 80);
  if (!who) return { ok: false, message: 'Type their @username or the Google address they signed in with.' };
  const person = await findPerson(who);
  if (!person) return { ok: false, message: `Nobody in TaskDrop matches “${who.replace(/^@/, '')}”. Check the @username on the People page, or type the Google address they signed in with.` };
  const role = str(form, 'role') || 'admin';
  if (!isStaffRole(role)) return { ok: false, message: 'Pick a role.' };

  // The role goes in first, so a new Viewer is never a full admin, even for a moment.
  const roleError = await setStaff(person.id, role, null);
  if (roleError) return { ok: false, message: roleError };
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
      ? `${person.name} is now an admin in the database, but this panel only lets in the accounts listed in ADMIN_EMAIL / ADMIN_PHONE. Add theirs there (comma-separated) for them to sign in.`
      : `${person.name} is now on the team as ${roleLabel(role)}.`,
  };
}

export async function removeAdmin(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
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

export async function setStaffRole(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
  const mfa = await moneyMfaGate();
  if (mfa) return { ok: false, message: mfa };
  const id = str(form, 'userId');
  const role = str(form, 'role');
  if (!isUuid(id)) return { ok: false, message: 'That person id looks wrong. Refresh the page.' };
  if (!isStaffRole(role)) return { ok: false, message: 'Pick a role.' };
  if (id === me.id) return { ok: false, message: 'You can’t change your own role. Ask another full admin.' };
  const err = await setStaff(id, role, null);
  if (err) return { ok: false, message: err };
  revalidateTeam();
  return { ok: true, message: `Now ${roleLabel(role)}.` };
}

/**
 * Staff alerts on or off. Anyone may change their own without an
 * authenticator code; changing someone else's is a full admin's job.
 */
export async function setStaffNotify(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const id = str(form, 'userId');
  const role = str(form, 'role');
  const on = str(form, 'on') === 'true';
  if (!isUuid(id) || !isStaffRole(role)) return { ok: false, message: 'Refresh the page and try again.' };
  if (id !== me.id) {
    const denied = await staffGate('admin');
    if (denied) return { ok: false, message: denied };
    const mfa = await moneyMfaGate();
    if (mfa) return { ok: false, message: mfa };
  }
  const err = await setStaff(id, role, on);
  if (err) return { ok: false, message: err };
  revalidateTeam();
  return { ok: true, message: on ? 'Alerts on.' : 'Alerts off.' };
}

/**
 * Flip one of the app-wide switches. Turning the developer sign-in switch ON
 * lets any phone number in with an auto-filled code, so that direction needs
 * the word ON typed as well.
 */
export async function setSwitch(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return { ok: false, message: denied };
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
