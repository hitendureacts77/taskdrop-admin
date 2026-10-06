import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Bypasses RLS entirely. The `server-only` import above turns any accidental
 * client-side import of this file into a build error, not a runtime leak --
 * that's the whole reason it exists, on top of the key never being
 * NEXT_PUBLIC_-prefixed.
 *
 * The admin panel uses it read-only, and only in src/lib/data.ts, for the
 * three things a signed-in admin session cannot read: refunds_outstanding
 * (revoked from authenticated, migration 036), payments (own-rows only) and a
 * person's phone/email (auth.users). The one write: deleteAccount in
 * src/lib/crm-actions.ts removes a deleted person's leftover photos from
 * storage, which SQL cannot do. Everything else goes through the admin's
 * own session so RLS still applies. Every call site MUST call requireAdmin()
 * first -- this client has no opinion about who's asking.
 */
export function createClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createSupabaseClient<Database>(URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
