'use client';

import { useState } from 'react';

type Props = { required: boolean; enrolled: boolean; verified: boolean };

const input = {
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 16,
  letterSpacing: '0.25em',
  width: 180,
} as const;

type MfaReply = { ok?: boolean; message?: string; factorId?: string; qr?: string; secret?: string };

/** One call to the server route; the session lives in HttpOnly cookies the page cannot read. */
async function callMfa(body: Record<string, string>): Promise<MfaReply> {
  try {
    const res = await fetch('/api/auth/mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const out = (await res.json().catch(() => ({}))) as MfaReply;
    if (res.status === 401) {
      // Signed out (idle or 12 hours); the middleware's message, if any, is shown on the login page.
      window.location.assign(out.message ? `/login?error=${encodeURIComponent(out.message)}` : '/login');
      return { ok: false };
    }
    if (!res.ok || !out.ok) return { ok: false, message: out.message ?? 'Something went wrong. Try again.' };
    return out;
  } catch {
    return { ok: false, message: 'Could not reach the server. Check your connection.' };
  }
}

/**
 * Set up an authenticator app (TOTP), or enter a code from it to unlock money
 * actions for this session. Every step goes through /api/auth/mfa, which calls
 * Supabase Auth's MFA API on the server (H37: the login cookies are HttpOnly).
 * The session cookie is upgraded to aal2 on success, so a reload lets every
 * server check see it.
 */
export function MfaPanel({ required, enrolled, verified }: Props) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const startSetup = async () => {
    setBusy(true);
    setMessage(null);
    const out = await callMfa({ action: 'setup' });
    setBusy(false);
    if (!out.ok || !out.factorId || !out.qr) {
      if (out.message) setMessage(out.message);
      return;
    }
    setFactorId(out.factorId);
    setQr(out.qr);
    setSecret(out.secret ?? null);
  };

  const startVerify = async () => {
    setMessage(null);
    const out = await callMfa({ action: 'factor' });
    if (!out.ok || !out.factorId) {
      if (out.message) setMessage(out.message);
      return;
    }
    setFactorId(out.factorId);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setMessage(null);
    const out = await callMfa({ action: 'verify', factorId, code: code.replace(/\D/g, '') });
    if (!out.ok) {
      setBusy(false);
      if (out.message) setMessage(out.message);
      return;
    }
    // The session is aal2 now; reload so every server check sees it.
    window.location.reload();
  };

  if (verified) {
    return (
      <p>
        <strong>Unlocked.</strong> This session has entered a code from your authenticator app, so money actions are allowed
        until you sign out.
      </p>
    );
  }

  const codeForm = (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        placeholder="123456"
        aria-label="Code from your authenticator app"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={busy}
        required
        autoFocus
        style={input}
      />
      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Checking…' : 'Verify code'}
      </button>
    </form>
  );

  return (
    <div>
      {!required ? (
        <p className="muted small">The requirement is switched off in Settings, so money actions do not need a code right now.</p>
      ) : null}

      {enrolled ? (
        <>
          <p>Enter the 6-digit code from your authenticator app to unlock money actions for this session.</p>
          {factorId ? codeForm : (
            <button type="button" className="btn" onClick={startVerify} disabled={busy}>
              Enter a code
            </button>
          )}
        </>
      ) : qr ? (
        <>
          <p>
            Scan this with Google Authenticator, Microsoft Authenticator, 1Password or any authenticator app, then type the
            6-digit code it shows.
          </p>
          {/* qr_code is an SVG data URL from Supabase Auth; img-src allows data: */}
          <img src={qr} alt="QR code for your authenticator app" width={180} height={180} style={{ background: '#fff', padding: 8, borderRadius: 8 }} />
          {secret ? (
            <p className="muted small" style={{ marginTop: 8 }}>
              Can’t scan? Enter this key by hand: <code style={{ userSelect: 'all' }}>{secret}</code>
            </p>
          ) : null}
          {codeForm}
        </>
      ) : (
        <>
          <p>
            Money actions — payouts, refunds, dispute decisions, wallet changes, settings and admin roles — need a code from an
            authenticator app on your phone, on top of your sign-in. Set one up once; after that you enter a code each time you
            sign in.
          </p>
          <button type="button" className="btn" onClick={startSetup} disabled={busy}>
            {busy ? 'One moment…' : 'Set up authenticator app'}
          </button>
        </>
      )}

      {message ? (
        <p style={{ marginTop: 12, color: 'var(--bad)' }} role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
