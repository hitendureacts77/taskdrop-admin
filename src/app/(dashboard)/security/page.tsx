import { MfaPanel } from '@/components/MfaPanel';
import { Card, Notice, PageHeader } from '@/components/ui';
import { requireAdmin } from '@/lib/data';
import { mfaState } from '@/lib/mfa';

export default async function SecurityPage() {
  await requireAdmin();
  const state = await mfaState();
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Security' }]}
        title="Security"
        sub="Signing in proves who you are once. Moving money asks again, with a code from your phone."
      />
      {state.required && !state.verified ? (
        <Notice tone="gold" icon="alert" title="Money actions are locked for this session.">
          Payouts, refunds, dispute decisions, wallet changes, settings and admin roles need a code from your authenticator app.
        </Notice>
      ) : null}
      <Card title="Authenticator app">
        <MfaPanel {...state} />
      </Card>
    </>
  );
}
