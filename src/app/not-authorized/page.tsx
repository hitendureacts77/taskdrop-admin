import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkAdmin } from '@/lib/auth';
import { endPanelSession } from '@/lib/sign-out';
import { createClient } from '@/lib/supabase/server';
import { getV2 } from '@/lib/v2-gate-server';
import { NotAuthorizedV2 } from './NotAuthorizedV2';

/** Ends this browser's session only: a non-admin's TaskDrop app sign-in elsewhere stays (B119, B131). */
async function signOutHere() {
  'use server';
  await endPanelSession('local');
  redirect('/login');
}

const button = {
  padding: '11px 16px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--surface2)',
  color: 'var(--ink)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
} as const;

export default async function NotAuthorizedPage({ searchParams }: { searchParams: Promise<{ why?: string }> }) {
  const unavailable = (await searchParams).why === 'unavailable';
  // A real admin who lands here (an old link, the back button) is sent to the panel instead of being told,
  // wrongly, that their account is not an admin account (B168, round 6).
  if (!unavailable && (await checkAdmin()).status === 'ok') redirect('/');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (await getV2()) return <NotAuthorizedV2 unavailable={unavailable} email={user?.email ?? null} signedIn={Boolean(user)} signOut={signOutHere} />;

  return (
    <main
      style={{
        minHeight: 'calc(100vh - var(--ribbon-h))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        {unavailable ? (
          <>
            <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Could not check your access</h1>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              We could not read your staff role just now, so the panel stays closed rather than guess. Try again in a minute.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Not an admin account</h1>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              {user?.email ? <>Signed in as <b style={{ color: 'var(--ink)' }}>{user.email}</b>, but that
              account is not an admin account. </> : null}
              Only the TaskDrop owner’s accounts can open this panel. Sign out, then sign in with the admin Google account or
              with the admin @username and password.
            </p>
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          {unavailable ? (
            <Link href="/" style={button}>
              Try again
            </Link>
          ) : null}
          {user ? (
            <form action={signOutHere}>
              <button type="submit" style={button}>
                Sign out and use another account
              </button>
            </form>
          ) : (
            <Link href="/login" style={button}>
              Go to sign-in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
