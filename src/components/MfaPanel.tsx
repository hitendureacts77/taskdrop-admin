'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

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

/**
 * Set up an authenticator app (TOTP), or enter a code from it to unlock money
 * actions for this session. Everything goes through Supabase Auth's MFA API from
 * the browser; the session cookie is upgraded to aal2 on success, so a reload
 * lets the server see it.
 */
export function MfaPanel({ required, enrolled, verified }: Props) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const startSetup = async () => {
    setBusy(true);
    setMessage(null);
    try {
      // A half-finished set-up blocks a new one, so clear any unverified factor.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `TaskDrop admin ${new Date().toISOString().slice(0, 16)}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not start the set-up. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const startVerify = async () => {
    setMessage(null);
    const { data, error } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.[0];
    if (error || !factor) {
      setMessage('No authenticator is set up on this account yet.');
      return;
    }
    setFactorId(factor.id);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\D/g, '') });
    if (error) {
      setBusy(false);
      setMessage(/invalid|incorrect/i.test(error.message) ? 'That code is not right. Codes change every 30 seconds.' : error.message);
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
