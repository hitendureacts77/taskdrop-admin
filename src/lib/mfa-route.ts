/**
 * The authenticator panel's server side (finding H37).
 *
 * The login cookies are HttpOnly, so the Security page can no longer call Supabase Auth's MFA API
 * from the browser. /api/auth/mfa does it on the server with the session in the cookies; a
 * successful code upgrades the session to aal2 and the server client writes the new cookies.
 *
 * Pure (the Supabase calls come in as `mfa`) so it can be tested without Next or Supabase.
 */

type Err = { message: string } | null;
type Factor = { id: string; status?: string; factor_type?: string };

/** The part of supabase.auth.mfa this uses. */
export type MfaApi = {
  listFactors(): Promise<{ data: { all?: Factor[]; totp?: Factor[] } | null; error: Err }>;
  unenroll(p: { factorId: string }): Promise<{ error: Err }>;
  enroll(p: { factorType: 'totp'; friendlyName?: string }): Promise<{
    data: { id: string; totp: { qr_code: string; secret: string } } | null;
    error: Err;
  }>;
  challengeAndVerify(p: { factorId: string; code: string }): Promise<{ error: Err }>;
};

export type MfaResult = { status: number; body: Record<string, unknown> };

const bad = (status: number, message: string): MfaResult => ({ status, body: { ok: false, message } });

/** A 6-digit code, spaces allowed. Null when it is not one. */
export function cleanCode(raw: unknown): string | null {
  const code = String(raw ?? '').replace(/\s/g, '');
  return /^\d{6}$/.test(code) ? code : null;
}

export async function runMfa(input: unknown, mfa: MfaApi, now: Date = new Date()): Promise<MfaResult> {
  const body = (input && typeof input === 'object' ? input : {}) as { action?: unknown; factorId?: unknown; code?: unknown };

  if (body.action === 'setup') {
    // A half-finished set-up blocks a new one, so clear any unverified factor.
    const { data: list } = await mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.status === 'unverified') await mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await mfa.enroll({
      factorType: 'totp',
      friendlyName: `TaskDrop admin ${now.toISOString().slice(0, 16)}`,
    });
    if (error || !data) return bad(400, error?.message ?? 'Could not start the set-up. Try again.');
    return { status: 200, body: { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
  }

  if (body.action === 'factor') {
    const { data, error } = await mfa.listFactors();
    const factor = data?.totp?.[0];
    if (error || !factor) return bad(404, 'No authenticator is set up on this account yet.');
    return { status: 200, body: { ok: true, factorId: factor.id } };
  }

  if (body.action === 'verify') {
    const code = cleanCode(body.code);
    if (!code) return bad(400, 'Type the 6-digit code from your authenticator app.');
    const factorId = String(body.factorId ?? '');
    // Only one of this account's own factors (Supabase checks too).
    const { data } = await mfa.listFactors();
    if (!factorId || !(data?.all ?? []).some((f) => f.id === factorId)) {
      return bad(400, 'That authenticator is not on this account. Reload the page and try again.');
    }
    const { error } = await mfa.challengeAndVerify({ factorId, code });
    if (error) {
      return bad(400, /invalid|incorrect/i.test(error.message) ? 'That code is not right. Codes change every 30 seconds.' : error.message);
    }
    return { status: 200, body: { ok: true } };
  }

  return bad(400, 'Unknown request.');
}
