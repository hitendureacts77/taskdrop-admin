import * as v2 from '@/components/v2/ui';
import { MfaPanel } from '@/components/MfaPanel';
import type { MfaState } from '@/lib/mfa';
import { roleLabel, type StaffRole } from '@/lib/staff-roles';
import { SettingsHead } from './SettingsHead';

/**
 * v2 My security (design security, F443–F446). Two-step sign-in is off for now (owner): the
 * authenticator card says so and points at the confirm steps. If the requirement is ever switched
 * on, today's MfaPanel (set up, verify) shows again so nobody is locked out.
 */
export function SecurityV2({ email, role, state, idleMinutes, sessionHours }: { email: string | null; role: StaffRole; state: MfaState; idleMinutes: number; sessionHours: number }) {
  return (
    <>
      <SettingsHead active="/security" role={role} sub="Your own sign-in." />
      {state.required && !state.verified ? (
        <v2.Note tone="gold" title="Money actions are locked for this session.">
          Payouts, refunds, dispute decisions, wallet changes, settings and admin roles need a code from your authenticator app.
        </v2.Note>
      ) : null}
      <v2.Grid cols={2}>
        <v2.Card title="Your sign-in">
          <v2.KV
            rows={[
              ['Signed in as', email ?? 'Your account'],
              ['With', email?.endsWith('@phone.taskdrop.app') ? '@username and password' : email ? 'Google' : '@username and password'],
              ['Role', roleLabel(role)],
              ['This session', `Lasts up to ${sessionHours} hours`],
              ['Idle sign-out', `After ${idleMinutes} minutes without activity`],
            ]}
          />
        </v2.Card>
        <v2.Card
          title={
            <>
              Authenticator app {state.required ? null : <v2.OffTag />}
            </>
          }
        >
          {state.required ? (
            <MfaPanel {...state} />
          ) : (
            <>
              <p className="wp8a-m0">
                Two-step sign-in is planned for later. Right now money actions are protected by a confirm step, and the biggest ones (refunds, payouts, deleting, kill switches) ask you to type a word.
              </p>
              <v2.Note title="The requirement is switched off in Settings,">so money actions do not need a code right now.</v2.Note>
              <div className="wp8a-small wp8a-mt">
                <b>When it is turned on later:</b>
              </div>
              <ol className="v2-muted wp8a-small wp8a-ol">
                <li>Scan a QR code with an authenticator app (or type the key by hand).</li>
                <li>Type the 6-digit code to finish.</li>
                <li>Money actions then ask for a code once per session (“Unlock money actions” appears in the top bar).</li>
              </ol>
              <button type="button" className="v2-btn sm wp8a-mt" disabled title="Off for now: turn on later">
                Set up authenticator app (later)
              </button>
            </>
          )}
        </v2.Card>
      </v2.Grid>
    </>
  );
}
