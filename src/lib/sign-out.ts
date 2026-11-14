import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from './supabase/server';

/**
 * Ends this browser's panel session: revokes the refresh token and clears the login cookies (via
 * the server client's setAll), and deletes the cookies even when Supabase cannot be reached (they
 * are HttpOnly, so only the server can). For a route handler or a server action.
 *
 * scope 'global' (the staff Sign out button) ends every session of the account; 'local' ends only
 * this one, for an account that is not an admin (B131): its TaskDrop app sign-in elsewhere stays.
 */
export async function endPanelSession(scope: 'global' | 'local' = 'global'): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope }).catch(() => undefined);
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (name.startsWith('sb-') || name === 'td_admin_active') jar.delete(name);
  }
}
