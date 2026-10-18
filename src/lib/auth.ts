import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isEmailAllowed, parseAllowlist, type Allowlist } from './allowlist';
import { asStaffRole, type StaffRole } from './staff-roles';
import { createClient } from './supabase/server';

export type AdminUser = {
  id: string;
  email: string | null;
  staffRole: StaffRole;
  /** admin_staff.notify: whether this person wants staff alerts (default on). */
  notify: boolean;
};

/**
 * Who may open this panel, on top of holding the admin role in the database.
 * ADMIN_EMAIL is the Google account, or several separated by commas.
 * ADMIN_PHONE is for an admin account that was created with a mobile number
 * (it sits on a placeholder email, p<number>@phone.taskdrop.app, and signs in
 * here with its @username and password -- the panel has no text-message
 * sign-in); it also takes a comma-separated list. When neither is set the
 * database role alone decides, as before. What each person may then change is
 * still decided by their staff role in the database.
 */
const digits10 = (s: string | undefined | null) => String(s ?? '').replace(/[^0-9]/g, '').slice(-10);

export function adminAllowlist(): Allowlist {
  return parseAllowlist(process.env.ADMIN_EMAIL, process.env.ADMIN_PHONE);
}

export function isAllowedIdentity(email: string | null): boolean {
  return isEmailAllowed(adminAllowlist(), email);
}

export const normalisePhone = digits10;

export type AdminCheck =
  | { status: 'ok'; user: AdminUser }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

/**
 * Whether the current request's cookies belong to a signed-in admin.
 *
 * Used from both a layout (which redirects) and route handlers (which return
 * 401/403 JSON) -- a route handler doesn't inherit a layout's guard, so every
 * mutating route under app/api/ calls this itself rather than trusting that
 * the browser only ever got there through the dashboard nav.
 *
 * getUser() round-trips to Supabase Auth to revalidate the JWT, unlike
 * getSession() which only reads the cookie -- worth the extra request on
 * every gated page, since this is the check standing in front of every
 * money-moving screen.
 */
export const checkAdmin = cache(async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'unauthenticated' };

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!role) return { status: 'forbidden' };
  // A database admin outside the allowlist is still turned away here.
  if (!isAllowedIdentity(user.email ?? null)) return { status: 'forbidden' };
  // No admin_staff row (or no migration 089 yet) means a full admin.
  const { data: staff } = await (supabase as unknown as SupabaseClient)
    .from('admin_staff')
    .select('staff_role, notify')
    .eq('user_id', user.id)
    .maybeSingle();
  const row = staff as { staff_role?: string; notify?: boolean } | null;
  const staffRole = asStaffRole(row?.staff_role);
  return { status: 'ok', user: { id: user.id, email: user.email ?? null, staffRole, notify: row?.notify !== false } };
});
