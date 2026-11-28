import Link from 'next/link';
import * as v2 from '@/components/v2/ui';

/**
 * Admin v2 "Not an admin account" / "Could not check your access" (gate on).
 * The page keeps today's checks and its sign-out action (this browser only);
 * this is only the look.
 */
export function NotAuthorizedV2({
  unavailable,
  email,
  signedIn,
  signOut,
}: {
  unavailable: boolean;
  email: string | null;
  signedIn: boolean;
  signOut: () => Promise<void>;
}) {
  return (
    <main className="v2-authwrap">
      <div className="v2-authcard">
        {unavailable ? (
          <v2.Empty title="Could not check your access" icon="alert">
            <p>We could not read your staff role just now, so the panel stays closed rather than guess. Try again in a minute.</p>
            <div className="v2-authacts">
              <Link href="/" className="v2-btn pri sm">
                Try again
              </Link>
              {signedIn ? (
                <form action={signOut}>
                  <button type="submit" className="v2-btn sm">
                    Sign out
                  </button>
                </form>
              ) : null}
            </div>
          </v2.Empty>
        ) : (
          <v2.Empty title="Not an admin account" icon="lock">
            <p>
              {email ? (
                <>
                  You are signed in as <b>{email}</b>, which is not on the staff list.{' '}
                </>
              ) : null}
              Only staff accounts can open this panel. Sign in with your staff Google account or your staff @username.
            </p>
            <div className="v2-authacts">
              {signedIn ? (
                <form action={signOut}>
                  <button type="submit" className="v2-btn sm">
                    Sign out and use another account
                  </button>
                </form>
              ) : (
                <Link href="/login" className="v2-btn sm">
                  Go to sign-in
                </Link>
              )}
            </div>
            {signedIn ? <p className="v2-muted v2-authsmall">Signs out in this browser only.</p> : null}
          </v2.Empty>
        )}
      </div>
    </main>
  );
}
