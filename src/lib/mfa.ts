import 'server-only';
import { createClient } from './supabase/server';

/**
 * Whether this admin session may move money.
 *
 * Sign-in is one factor (Google, or @username + password). Money actions also
 * need the session to have verified a code from an authenticator app -- Supabase
 * Auth then marks the session aal2. The database enforces the same rule
 * (migration 080) for everything that writes through an RPC; this check runs
 * first so the panel can say what to do, and it is the only check for the
 * actions that run through edge functions (refunds, RazorpayX), which the
 * database sees as the service role.
 *
 * settings.admin_require_mfa switches it (on unless explicitly false).
 */
export type MfaState = {
  /** The setting is on. */
  required: boolean;
  /** This account has a verified authenticator. */
  enrolled: boolean;
  /** This session has entered a code from it. */
  verified: boolean;
};

export async function mfaState(): Promise<MfaState> {
  const supabase = await createClient();
  const [{ data: aal }, { data: setting }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.from('settings').select('value').eq('key', 'admin_require_mfa').maybeSingle(),
  ]);
  return {
    required: setting?.value !== false,
    // nextLevel is aal2 only when the account has a verified factor.
    enrolled: aal?.nextLevel === 'aal2',
    verified: aal?.currentLevel === 'aal2',
  };
}

/** null when a money action may go ahead; otherwise the sentence to show. */
export async function moneyMfaGate(): Promise<string | null> {
  const s = await mfaState();
  if (!s.required || s.verified) return null;
  return s.enrolled
    ? 'Enter your authenticator code on the Security page first, then try again.'
    : 'Money actions need an authenticator app. Set one up on the Security page first.';
}
