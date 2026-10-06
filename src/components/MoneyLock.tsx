import Link from 'next/link';
import type { MfaState } from '@/lib/mfa';
import { Notice } from './ui';

/** Shown above money buttons while this session can't use them yet. */
export function MoneyLock({ mfa }: { mfa: MfaState }) {
  if (!mfa.required || mfa.verified) return null;
  return (
    <Notice tone="gold" icon="shield" title="Money buttons are locked until you verify your authenticator.">
      {mfa.enrolled
        ? 'Paying, marking and putting money back all need a 6-digit code from your authenticator app, once per sign-in. '
        : 'Paying, marking and putting money back all need an authenticator app on your phone. Set one up once, then enter a code each time you sign in. '}
      <Link href="/security" className="btn btn-small btn-primary">
        {mfa.enrolled ? 'Enter a code' : 'Set up authenticator'}
      </Link>
    </Notice>
  );
}
