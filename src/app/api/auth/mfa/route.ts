import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { runMfa, type MfaApi } from '@/lib/mfa-route';
import { TOO_FAST, withinRate } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * The Security page's authenticator set-up and code check, on the server (H37): the login
 * cookies are HttpOnly, so the browser cannot call Supabase Auth's MFA API itself. Body:
 *   { action: 'setup' }                       start a new authenticator (QR + key)
 *   { action: 'factor' }                      which authenticator to enter a code for
 *   { action: 'verify', factorId, code }      check a code; the session becomes aal2
 * A verified code makes the server client write the upgraded session cookies on this response.
 */
export async function POST(req: Request) {
  const check = await checkAdmin();
  if (check.status !== 'ok') return json({ ok: false }, check.status === 'unauthenticated' ? 401 : 403);
  // Ten a minute per staff member: enough for typos, too few to guess codes.
  if (!(await withinRate(check.user.id, 'admin-mfa', 10))) return json({ ok: false, message: TOO_FAST }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: 'Expected a JSON body' }, 400);
  }

  const supabase = await createClient();
  const out = await runMfa(body, supabase.auth.mfa as unknown as MfaApi);
  return json(out.body, out.status);
}
