'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  // useSearchParams opts a page out of static rendering unless it's inside
  // its own Suspense boundary -- Next build fails without this wrapper.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get('error'));

  const signIn = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setBusy(false);
    }
    // On success the browser navigates away to Google -- nothing else to do here.
  };

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
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: 32,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)' }}>
          TASKDROP
        </div>
        <h1 style={{ fontSize: 22, margin: '10px 0 6px', letterSpacing: '-0.01em' }}>Ops console</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 22px', lineHeight: 1.5 }}>
          Staff only. Sign in with the Google account your admin access is tied to.
        </p>

        <button
          onClick={signIn}
          disabled={busy}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'var(--surface2)',
            color: 'var(--ink)',
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {error ? (
          <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--bad)' }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}
