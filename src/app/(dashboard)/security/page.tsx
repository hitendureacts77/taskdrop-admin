import { MfaPanel } from '@/components/MfaPanel';
import { Card, Notice } from '@/components/ui';
import { ConfigHeader } from '@/components/views/AdminConfigViews';
import { SecurityV2 } from '@/components/v2/settings/SecurityV2';
import { requireAdmin } from '@/lib/data';
import { mfaState } from '@/lib/mfa';
import { adminCookieMaxAgeSeconds } from '@/lib/supabase/cookie-options';
import { getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'My security' };

export default async function SecurityPage() {
  const me = await requireAdmin();
  const [state, v2] = await Promise.all([mfaState(), getV2()]);
  if (v2) {
    return (
      <SecurityV2
        email={me.email}
        role={me.staffRole}
        state={state}
        idleMinutes={Math.max(1, Number(process.env.ADMIN_IDLE_MINUTES) || 30)}
        sessionHours={Math.round(adminCookieMaxAgeSeconds(process.env.ADMIN_SESSION_HOURS) / 3600)}
      />
    );
  }
  return (
    <>
      <ConfigHeader active="security" />
      {state.required && !state.verified ? (
        <Notice tone="gold" icon="alert" title="Money actions are locked for this session.">
          Payouts, refunds, dispute decisions, wallet changes, settings and admin roles need a code from your authenticator app.
        </Notice>
      ) : null}
      <Card title="Authenticator app" sub="Signing in proves who you are once. Moving money asks again, with a code from your phone.">
        <MfaPanel {...state} />
      </Card>
    </>
  );
}
