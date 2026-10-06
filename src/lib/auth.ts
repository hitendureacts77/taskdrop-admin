import { createClient } from './supabase/server';

export type AdminUser = { id: string; email: string | null };

/**
 * Who may open this panel, on top of holding the admin role in the database.
 * ADMIN_EMAIL is the Google account. ADMIN_PHONE is for an admin account that
 * was created with a mobile number (it sits on a placeholder email,
 * p<number>@phone.taskdrop.app, and signs in here with its @username and
 * password -- the panel has no text-message sign-in). When neither is set the
 * database role alone decides, as before.
 */
const digits10 = (s: string | undefined | null) => String(s ?? '').replace(/[^0-9]/g, '').slice(-10);

export function adminAllowlist(): { email: string; phone: string } {
  return { email: (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase(), phone: digits10(process.env.ADMIN_PHONE) };
}

export function isAllowedIdentity(email: string | null): boolean {
  const a = adminAllowlist();
  if (!a.email && a.phone.length !== 10) return true;
  const e = (email ?? '').trim().toLowerCase();
  return (a.email !== '' && e === a.email) || (a.phone.length === 10 && e === `p${a.phone}@phone.taskdrop.app`);
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
export async function checkAdmin(): Promise<AdminCheck> {
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
  return { status: 'ok', user: { id: user.id, email: user.email ?? null } };
}
