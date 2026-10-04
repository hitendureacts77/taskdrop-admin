import { NextResponse } from 'next/server';
import { adminAllowlist, checkAdmin, normalisePhone } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Phone sign-in for the admin, and only for the admin's own number.
 *
 * The code is texted by the app's phone-auth function (the same one the app
 * uses), which owns the code, its expiry, the resend cooldown and the guess
 * limit. This route adds three rules of its own:
 *   - ADMIN_PHONE must be set, and only that number gets a code. Nobody else can
 *     use this page to make the SMS service text a stranger.
 *   - A code is never passed back to the browser, even if the function offers one.
 *   - After the code checks out, the account must still be an allowed admin;
 *     otherwise the session is thrown away straight away.
 *
 * It is OFF unless ADMIN_PHONE_LOGIN=on. The phone-auth function can hand a
 * login code back to the caller for numbers on its developer test list, which
 * would let anyone sign in as that number. Only switch this on once the SMS
 * service is connected and the admin number is off that test list.
 */

const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/phone-auth`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

async function phoneAuth(body: Record<string, unknown>): Promise<{ status: number; out: Record<string, unknown> }> {
  const res = await fetch(FN, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const out = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, out };
}

const fail = (message: string, status: number, extra?: Record<string, unknown>) => NextResponse.json({ ok: false, message, ...extra }, { status });

/** The phone service says "SMS is not set up" until a text provider is connected. */
function friendly(message: string, status: number): { message: string; smsNotSetUp?: boolean } {
  if (/sms is not set up/i.test(message)) {
    return { message: 'Text codes are not switched on yet: the SMS service still needs to be connected. Use Google for now.', smsNotSetUp: true };
  }
  if (status === 429) return { message };
  return { message: message || 'Could not do that. Try again in a moment.' };
}

export async function POST(req: Request) {
  let body: { action?: string; phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return fail('Expected a JSON body', 400);
  }

  if ((process.env.ADMIN_PHONE_LOGIN ?? '').trim().toLowerCase() !== 'on') {
    return fail('Phone sign-in is switched off for now. Use Google.', 403);
  }
  const allowed = adminAllowlist().phone;
  if (allowed.length !== 10) return fail('Phone sign-in is not set up for this panel.', 403);
  const phone = normalisePhone(body.phone);
  if (phone.length !== 10) return fail('Enter your 10-digit mobile number.', 400);
  if (phone !== allowed) return fail('That number is not an admin number.', 403);

  if (body.action === 'send') {
    const { status, out } = await phoneAuth({ action: 'send', phone, mode: 'signin' });
    if (status >= 400 || out.error) {
      const f = friendly(String(out.error ?? ''), status);
      return fail(f.message, status >= 400 ? status : 400, f.smsNotSetUp ? { smsNotSetUp: true } : undefined);
    }
    // `devCode` would only ever be present on a development setup; never relay it.
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'verify') {
    const code = String(body.code ?? '').replace(/[^0-9]/g, '');
    if (code.length < 4) return fail('Enter the code from the text message.', 400);
    const { status, out } = await phoneAuth({ action: 'verify', phone, code, mode: 'signin' });
    if (status >= 400 || out.error || !out.token_hash) {
      return fail(String(out.error ?? 'That code is not right.'), status >= 400 ? status : 400);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: String(out.token_hash), type: 'email' });
    if (error) return fail(/banned/i.test(error.message) ? 'This account is suspended.' : error.message, 401);

    const check = await checkAdmin();
    if (check.status !== 'ok') {
      await supabase.auth.signOut();
      return fail('That number is not an admin account.', 403);
    }
    return NextResponse.json({ ok: true });
  }

  return fail('Unknown action.', 400);
}
