import { createClient } from '@/lib/supabase/server';

export default async function NotAuthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Not an admin account</h1>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          {user?.email ? <>Signed in as <b style={{ color: 'var(--ink)' }}>{user.email}</b>, but that
          account has no admin role. </> : null}
          Ask an existing admin to grant it, or sign in with a different Google account.
        </p>
      </div>
    </main>
  );
}
