/**
 * The safety guard on "Authenticator code for money actions" (B112). Turning it on while this
 * admin has no authenticator would lock them out of every money action at once, so the server
 * refuses; when other admins have none it warns loudly. The authenticator itself is future scope.
 * `withMfa` is null when the panel cannot read who has one (no service key).
 */
export type MfaSwitchInput = { turningOn: boolean; meEnrolled: boolean; withMfa: number | null; total: number };

export function mfaSwitchCheck(i: MfaSwitchInput): { refuse: string | null; warn: string | null } {
  if (!i.turningOn) return { refuse: null, warn: null };
  const refuse = i.meEnrolled
    ? null
    : 'You have no authenticator set up. Turning this on would stop you, and every admin without one, from moving any money. Set one up on the Security page first.';
  let warn: string | null = null;
  if (i.withMfa === 0) warn = `No admin has an authenticator set up (0 of ${i.total}). Turning this on would stop every money action for everyone.`;
  else if (i.withMfa !== null && i.withMfa < i.total) {
    const missing = i.total - i.withMfa;
    warn = `${missing} of ${i.total} admins have no authenticator. They will not be able to move money until they set one up.`;
  } else if (i.withMfa === null) warn = 'The panel cannot see who has an authenticator. Check the Team page before turning this on.';
  return { refuse, warn };
}
