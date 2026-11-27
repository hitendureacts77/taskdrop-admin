import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Starts "Continue with Google" on the server (H37).
 *
 * Before this the login page called signInWithOAuth in the browser, so the one-time PKCE code
 * verifier was written by the browser client as a cookie page scripts could read. Here the server
 * client writes it, through the same cookie rules as the login cookies (HttpOnly, Secure in
 * production, SameSite=Lax, lib/supabase/cookie-options.ts), and /auth/callback reads it back on
 * the server to finish the exchange. The browser only follows two redirects.
 *
 * A plain GET link, not a form: the CSP's `form-action 'self'` would block a form's redirect on to
 * Google. Starting a Google sign-in changes nothing until the person finishes it at Google.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return NextResponse.redirect(`${origin}/login?error=google`);
  return NextResponse.redirect(data.url);
}
