import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Username + password sign-in for the admin.
 *
 * The app's password-auth function owns the check: it resolves the @username
 * to the account server-side, signs in exactly as the app would, and throttles
 * failures per username and per IP. This route adds two rules of its own:
 *   - The session tokens never reach the browser. They are turned into the
 *     panel's own httpOnly session cookies right here.
 *   - After sign-in the account must be an allowed admin (role + allowlist);
 *     otherwise the session is thrown away straight away, with the same message
 *     as a wrong password so the panel does not reveal who is an admin.
 *
 * A password is a single factor; money actions additionally require a verified
 * authenticator code (see /security).
 */

const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/password-auth`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const WRONG = 'That username and password do not match';

const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return fail('Expected a JSON body', 400);
  }

  const username = String(body.username ?? '').trim().replace(/^@/, '').toLowerCase();
  const password = String(body.password ?? '');
  if (!/^[a-z0-9_]{3,20}$/.test(username) || password.length < 1 || password.length > 200) {
    return fail(WRONG, 400);
  }

  const res = await fetch(FN, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store',
  });
  const out = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };

  if (res.status === 429) return fail(out.error ?? 'Too many attempts. Try again later.', 429);
  if (res.status === 503) return fail(out.error ?? 'Sign-in is busy. Try again in a minute.', 503);
  if (!res.ok || !out.access_token || !out.refresh_token) return fail(WRONG, 401);

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: out.access_token,
    refresh_token: out.refresh_token,
  });
  if (error) return fail(/banned/i.test(error.message) ? 'This account is suspended.' : WRONG, 401);

  const check = await checkAdmin();
  if (check.status !== 'ok') {
    await supabase.auth.signOut();
    return fail(WRONG, 401);
  }
  return NextResponse.json({ ok: true });
}
