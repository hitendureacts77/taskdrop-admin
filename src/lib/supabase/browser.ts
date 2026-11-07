import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/db';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * For the login page's Google button only: it starts the Google sign-in and stores the one-time
 * PKCE code verifier, which /auth/callback reads on the server. It can never see the session --
 * the login cookies are HttpOnly (H37, ./cookie-options.ts) -- so nothing else may use it: the
 * live panel gets its token from /api/live/token and the authenticator runs through /api/auth/mfa.
 */
export function createClient() {
  return createBrowserClient<Database>(URL, ANON_KEY);
}
