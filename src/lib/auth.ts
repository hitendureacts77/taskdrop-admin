import { createClient } from './supabase/server';

export type AdminUser = { id: string; email: string | null };

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
  return { status: 'ok', user: { id: user.id, email: user.email ?? null } };
}
