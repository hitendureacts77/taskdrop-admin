import Link from 'next/link';
import type { ReactNode } from 'react';
import * as v2 from '@/components/v2/ui';
import type { Integrations } from '@/lib/admin-config';
import { allowlistCount } from '@/lib/allowlist';
import { inr, istDateTime, timeAgo } from '@/lib/format';
import type { StaffRole } from '@/lib/staff-roles';
import { SettingsToolsHead } from './SettingsToolsHead';

function Box({ name, status, tone, rows, children }: { name: string; status: string; tone: v2.Tone; rows: [ReactNode, ReactNode][]; children?: ReactNode }) {
  return (
    <v2.Card
      title={
        <span className="v2-row">
          {name} <v2.Pill tone={tone}>{status}</v2.Pill>
        </span>
      }
    >
      <v2.KV rows={rows} />
      {children}
    </v2.Card>
  );
}

/**
 * Integrations, read-only (F425–F431). `i.allowlist` arrives already masked
 * for roles other than Admin and Support (the page does it, as today).
 */
export function IntegrationsV2({ i, role, idleSetting }: { i: Integrations; role: StaffRole; idleSetting: number | null }) {
  const n = allowlistCount(i.allowlist);
  const allow = n > 1 ? `${n} accounts` : i.allowlist.emails[0] || (i.allowlist.phones[0] ? `+91 ${i.allowlist.phones[0]}` : '');
  const rx = i.razorpayx;
  const idleDiffers = idleSetting !== null && idleSetting !== i.idleMinutes;
  return (
    <>
      <SettingsToolsHead active="/settings/integrations" role={role} sub="What TaskDrop is connected to. Read-only: nothing here can be changed from the panel." />
      <v2.Grid cols={2}>
        <Box
          name="Supabase"
          status={i.supabase.ok ? 'Connected' : 'Not reachable'}
          tone={i.supabase.ok ? 'ok' : 'danger'}
          rows={[
            ['What it does', 'Database, sign-in and file storage for the app and this panel'],
            ['Project', <span className="v2-mono">{i.supabase.projectRef || '—'}</span>],
            ['Answered in', i.supabase.ms !== null ? `${i.supabase.ms} ms` : <span className="v2-mono v2-muted">{i.supabase.error ?? 'No answer'}</span>],
          ]}
        />
        <Box
          name="Service key"
          status={i.serviceKey ? 'Set' : 'Missing'}
          tone={i.serviceKey ? 'ok' : 'bad'}
          rows={[
            ['What it is', 'A server-only key for the few things an admin session can’t read: refunds owed, payment ids, people’s email and phone.'],
            [
              i.serviceKey ? 'If it goes missing' : 'How to add it',
              <>
                Ask the developer to add it to the panel’s server settings <span className="v2-mono v2-muted">(SUPABASE_SERVICE_ROLE_KEY)</span>. Pages that need it say so.
              </>,
            ],
          ]}
        />
        <Box
          name="Panel sign-in"
          status={allow ? 'Allowlist on' : 'Role only'}
          tone={allow ? 'ok' : 'wait'}
          rows={[
            ['How staff sign in', 'Google, or @username and password'],
            [n > 1 ? 'Allowed accounts' : 'Allowed account', allow || 'Any account with the admin role'],
            ['Signs staff out after', `${i.idleMinutes} minutes idle`],
          ]}
        >
          {idleDiffers ? (
            <div className="wp8b-gap">
              <v2.Note tone="orange" title="Two different idle times">
                The server signs staff out after <b>{i.idleMinutes} minutes</b>, but Money &amp; timing says <b>{idleSetting}</b>. The server’s number is the one that applies.
              </v2.Note>
            </div>
          ) : null}
          <p className="v2-muted wp8b-sm wp8b-gap">
            Who may sign in is managed on <Link href="/settings/team">Team &amp; access</Link>.
          </p>
        </Box>
        <Box
          name="RazorpayX payouts"
          status={!rx.configured ? 'Not set up' : rx.error ? 'Error' : 'Connected'}
          tone={!rx.configured ? 'mut' : rx.error ? 'danger' : 'ok'}
          rows={[
            ['Withdrawals paid', i.payoutMethod === 'razorpayx' ? 'Through RazorpayX' : 'By hand'],
            ['Balance', rx.configured ? (rx.balanceMinor !== null ? inr(rx.balanceMinor) : <span className="v2-muted">{rx.error ?? '—'}</span>) : <span className="v2-muted">Not connected</span>],
          ]}
        >
          <p className="v2-muted wp8b-sm wp8b-gap">
            Sends workers’ withdrawals to their bank or UPI automatically once its keys are added. See <Link href="/payouts">Payouts</Link>.
          </p>
        </Box>
        <Box
          name="Razorpay payments"
          status={i.lastPayment ? 'Receiving' : i.serviceKey ? 'No payments yet' : 'Unknown'}
          tone={i.lastPayment ? 'ok' : 'mut'}
          rows={[
            ['What it does', 'Posters pay for jobs and promotions through Razorpay checkout'],
            ['Last payment', i.lastPayment ? <span title={istDateTime(i.lastPayment)}>{timeAgo(i.lastPayment)}</span> : '—'],
          ]}
        />
        <Box
          name="Push notifications"
          status={i.pushDevices === null ? 'Unknown' : i.pushDevices > 0 ? 'Active' : 'No devices'}
          tone={i.pushDevices ? 'ok' : 'mut'}
          rows={[
            ['What it does', 'Phone notifications for quotes, messages, payouts and your customer messages'],
            ['Phones registered', i.pushDevices === null ? '—' : i.pushDevices.toLocaleString('en-IN')],
          ]}
        />
      </v2.Grid>
      <div className="wp8b-gap">
        <v2.Note tone="gold" title="About keys">
          Keys and secrets are never shown here. The developer changes them in the hosting settings (this panel) or in Supabase function secrets (the app), never in this panel.
        </v2.Note>
      </div>
    </>
  );
}
