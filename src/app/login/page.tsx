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

const field = {
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 14,
} as const;

function LoginForm() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get('error'));

  // Username sign-in: the admin's @username and the password set for it in the
  // app (Settings -> Security). The session is set server-side as cookies.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const passwordSignIn = async () => {
    setPasswordBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !out.ok) {
        setError(out.message ?? 'Could not sign in. Try again in a moment.');
        return;
      }
      window.location.href = '/';
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setPasswordBusy(false);
    }
  };

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
          Staff only. Sign in with the admin Google account, or with the admin username and password.
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px', color: 'var(--muted)', fontSize: 11.5 }}>
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          or with your username
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void passwordSignIn();
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="@username"
            aria-label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={passwordBusy}
            required
            style={field}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={passwordBusy}
            required
            style={field}
          />
          <button
            type="submit"
            disabled={passwordBusy}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--surface2)',
              color: 'var(--ink)',
              fontSize: 14,
              fontWeight: 600,
              cursor: passwordBusy ? 'default' : 'pointer',
              opacity: passwordBusy ? 0.6 : 1,
            }}
          >
            {passwordBusy ? 'One moment…' : 'Sign in'}
          </button>
        </form>

        {error ? (
          <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--bad)' }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}
