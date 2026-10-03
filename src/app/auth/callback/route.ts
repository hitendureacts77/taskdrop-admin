import { NextResponse } from 'next/server';
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
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
