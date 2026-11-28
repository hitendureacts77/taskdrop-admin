'use client';

import { useState } from 'react';

/**
 * Admin v2 sign-in (gate on). Same two ways in as today's page, with the same
 * calls: Google starts on the server (/auth/google), and the @username form
 * posts to /api/auth/password, which sets the session as cookies. The error
 * line is chosen on the server from fixed sentences (login-errors.ts, B130).
 */
export function LoginV2({ initialError }: { initialError: string | null }) {
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
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

  const signIn = () => {
    setBusy(true);
    setError(null);
    window.location.href = '/auth/google';
  };

  return (
    <main className="v2-authwrap">
      <div className="v2-authcard">
        <div className="v2-authlogo">
          <span className="mark" aria-hidden="true">
            TD
          </span>
          <span>
            TaskDrop
            <small>Ops console</small>
          </span>
        </div>
        <h1>Sign in</h1>
        <p className="v2-muted">Staff only. Only accounts on the staff list can get in.</p>

        {error ? (
          <div className="v2-note orange" role="alert">
            {error}
          </div>
        ) : null}

        <button type="button" className="v2-btn pri v2-authbtn" onClick={signIn} disabled={busy}>
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <div className="v2-author" aria-hidden="true">
          <span />
          or with your username
          <span />
        </div>

        <form
          className="v2-authform"
          onSubmit={(e) => {
            e.preventDefault();
            void passwordSignIn();
          }}
        >
          <label htmlFor="v2-login-user">@username</label>
          <input
            id="v2-login-user"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="@yourname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={passwordBusy}
            required
          />
          <label htmlFor="v2-login-pass">Password</label>
          <input
            id="v2-login-pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={passwordBusy}
            required
          />
          <button type="submit" className="v2-btn v2-authbtn" disabled={passwordBusy}>
            {passwordBusy ? 'One moment…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
