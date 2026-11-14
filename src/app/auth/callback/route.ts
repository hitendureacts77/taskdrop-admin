import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { securityEvent } from '@/lib/security-event';
import { endPanelSession } from '@/lib/sign-out';
import { createClient } from '@/lib/supabase/server';

/**
 * Google lands back here with a one-time `?code=`. This runs exactly once
 * per real HTTP request -- unlike the mobile app's AuthProvider, which has to
 * defend exchangeCodeForSession against React re-firing the same effect
 * twice in dev, a Route Handler has no such race, so a single plain exchange
 * is correct here.
 *
 * exchangeCodeForSession posts its argument as `auth_code` verbatim -- it
 * must be the bare code value, never the full callback URL (that exact bug
 * was the root cause of every "Google sign-in doesn't work" report on the
 * mobile app before it was found and fixed).
 *
 * After the exchange the account must be an allowed admin, as in the password
 * route; otherwise this session is ended straight away (B131), so a non-admin
 * Google account never keeps live login cookies on the admin domain. The login
 * page is sent only fixed codes, never Google's or Supabase's text (B130).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=google`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=link`);
    }
    const check = await checkAdmin();
    if (check.status !== 'ok') {
      // Only this browser's session ends: the account's TaskDrop app sign-in elsewhere stays.
      await endPanelSession('local');
      const why = check.status === 'forbidden' && check.reason === 'unavailable' ? 'unavailable' : 'not_admin';
      if (why === 'not_admin') securityEvent('admin_google_signin_refused');
      return NextResponse.redirect(`${origin}/login?error=${why}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
