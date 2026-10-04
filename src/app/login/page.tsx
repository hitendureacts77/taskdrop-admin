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

  // Phone sign-in: the admin's own number, a code by text, then in.
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneBusy, setPhoneBusy] = useState(false);

  const phoneCall = async (action: 'send' | 'verify') => {
    setPhoneBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, phone, code }),
      });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !out.ok) {
        setError(out.message ?? 'Could not do that. Try again in a moment.');
        return;
      }
      if (action === 'send') setStep('code');
      else window.location.href = '/';
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setPhoneBusy(false);
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
          Staff only. Sign in with the admin Google account, or with the admin mobile number.
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
          or with your mobile number
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void phoneCall(step === 'phone' ? 'send' : 'verify');
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            aria-label="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={step === 'code' || phoneBusy}
            required
            style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14 }}
          />
          {step === 'code' ? (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code from the text message"
              aria-label="Code from the text message"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={phoneBusy}
              required
              autoFocus
              style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, letterSpacing: '0.2em' }}
            />
          ) : null}
          <button
            type="submit"
            disabled={phoneBusy}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--surface2)',
              color: 'var(--ink)',
              fontSize: 14,
              fontWeight: 600,
              cursor: phoneBusy ? 'default' : 'pointer',
              opacity: phoneBusy ? 0.6 : 1,
            }}
          >
            {phoneBusy ? 'One moment…' : step === 'phone' ? 'Text me a code' : 'Sign in'}
          </button>
          {step === 'code' ? (
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
              style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer', padding: 0 }}
            >
              Use a different number
            </button>
          ) : null}
        </form>

        {error ? (
          <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--bad)' }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}
