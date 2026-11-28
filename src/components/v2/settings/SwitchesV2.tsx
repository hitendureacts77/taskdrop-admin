import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import { istDateTime } from '@/lib/format';
import type { Switch, SwitchKey } from '@/lib/admin-config';
import type { HistoryRow } from '@/lib/controls-history';
import type { SettingValue } from '@/lib/data/settings';
import type { StaffRole } from '@/lib/staff-roles';
import { v2SetDevOtp, v2SetMoneyPaused } from '@/lib/v2/settings-actions';
import { SettingsHead } from './SettingsHead';
import { SwitchHistory } from './SwitchHistory';

const changed = (at: string | null | undefined) => (at ? `Last changed ${istDateTime(at)}` : 'Never changed');

/** v2 App switches (design setSwitches, F390–F396): developer sign-in as a red blocker, money switches, history. */
export function SwitchesV2({
  role,
  switches,
  payoutMethod,
  withMfa,
  team,
  money,
  history,
}: {
  role: StaffRole;
  switches: Record<SwitchKey, Switch>;
  payoutMethod: 'manual' | 'razorpayx';
  withMfa: number | null;
  team: number;
  money: Record<'money_paused' | 'money_flow' | 'money_provider', SettingValue>;
  history: { rows: HistoryRow[]; error: string | null };
}) {
  const dev = switches.dev_otp_for_all;
  const paused = money.money_paused?.value === true;
  const flow = money.money_flow?.value === 'plan_b' ? 'Pay per task' : money.money_flow?.value === 'wallet' ? 'Wallet (before Plan B)' : 'Not set';
  const provider = money.money_provider?.value === 'razorpay' ? 'Razorpay' : money.money_provider?.value === 'simulated' ? 'Simulated (test)' : 'Not set';

  return (
    <>
      <SettingsHead active="/settings/switches" role={role} />
      {dev.on ? (
        <v2.Blocker title="Developer sign-in is ON.">Anyone can sign in to any phone number’s account. Switch it off before real people use TaskDrop.</v2.Blocker>
      ) : null}
      <v2.Grid cols="main">
        <div className="wp8a-stack">
          <v2.Card title="App switches">
            <div className={`wp8a-swrow${dev.on ? ' blk' : ''}`}>
              <div className="tx">
                <b>Developer sign-in</b> <span className="v2-mono v2-muted wp8a-key">dev_otp_for_all</span>
                <div className="d">When on, every phone number signs in with an auto-filled code. Only for testing.</div>
                <div className="v2-muted wp8a-small">{changed(dev.updatedAt)}</div>
              </div>
              <Confirm
                action={v2SetDevOtp}
                hidden={{ on: String(!dev.on) }}
                label={dev.on ? 'Turn off developer sign-in' : 'Turn on developer sign-in'}
                asSwitch={{ on: dev.on, red: true }}
                tier={3}
                area="admin"
                word={dev.on ? 'OFF' : 'ON'}
                tone={dev.on ? 'pri' : 'danger'}
                title={dev.on ? 'Turn off developer sign-in?' : 'Turn on developer sign-in?'}
                body={<p>{dev.on ? 'People need a real SMS code again.' : 'Anyone can sign in to any account with an auto-filled code. Only for testing.'}</p>}
                reason={{ label: 'Why? (kept in the switch history)' }}
                confirmLabel={dev.on ? 'Turn off' : 'Turn on'}
              />
            </div>
            <div className="wp8a-swrow">
              <div className="tx">
                <b>Authenticator code for money actions</b> <v2.OffTag />
                <div className="d">
                  Two-step sign-in is planned for later. Until then money actions ask you to confirm, and the biggest ones ask you to type a word.
                  {withMfa !== null ? ` ${withMfa} of ${team} staff have an authenticator today.` : ''}
                </div>
                <div className="v2-muted wp8a-small">{changed(switches.admin_require_mfa.updatedAt)}</div>
              </div>
              <button type="button" className={`v2-tg${switches.admin_require_mfa.on ? ' on' : ''}`} role="switch" aria-checked={switches.admin_require_mfa.on} aria-label="Authenticator code for money actions" disabled title="Off for now: turn on later, after every staff member sets one up" />
            </div>
            <div className="wp8a-swrow">
              <div className="tx">
                <b>How withdrawals are paid</b>
                <div className="d">{payoutMethod === 'razorpayx' ? 'Automatically through RazorpayX.' : 'By hand. RazorpayX is not set up.'}</div>
              </div>
              <Link className="v2-btn sm" href="/payouts">
                Change on Payouts
              </Link>
            </div>
          </v2.Card>
          <v2.Card
            title={
              <>
                Money switches <v2.NewTag />
              </>
            }
            sub="Already on the server; today they have no switch on screen."
          >
            <div className={`wp8a-swrow${paused ? ' blk' : ''}`}>
              <div className="tx">
                <b>Pause all money</b> <span className="v2-mono v2-muted wp8a-key">money_paused</span>
                <div className="d">
                  {paused ? 'Paused: nobody can pay, releases and refunds wait.' : 'Money is running. Turn on to stop payments, releases and refunds at once, for example if Razorpay has a problem.'}
                </div>
                <div className="v2-muted wp8a-small">{changed(money.money_paused?.updatedAt)}</div>
              </div>
              <Confirm
                action={v2SetMoneyPaused}
                hidden={{ paused: String(!paused) }}
                label={paused ? 'Resume money' : 'Pause all money'}
                asSwitch={{ on: paused, red: true }}
                tier={3}
                area="admin"
                word={paused ? 'RESUME' : 'PAUSE'}
                tone={paused ? 'pri' : 'danger'}
                title={paused ? 'Start money again?' : 'Pause all money?'}
                body={<p>{paused ? 'Payments, releases and refunds start again.' : 'Nobody can pay for a new job. Releases and refunds stop until you resume. Money already held stays safe.'}</p>}
                reason={{ label: 'Why? (kept in the switch history)' }}
                confirmLabel={paused ? 'Resume' : 'Pause money'}
              />
            </div>
            <div className="wp8a-swrow">
              <div className="tx">
                <b>How money flows</b> <span className="v2-mono v2-muted wp8a-key">money_flow</span>
                <div className="d">Pay per task (Plan B): the poster pays when hiring, the money waits at Razorpay, the worker gets it when the job is approved.</div>
              </div>
              <v2.Pill tone="ok">{flow}</v2.Pill>
            </div>
            <div className="wp8a-swrow">
              <div className="tx">
                <b>Payment provider</b> <span className="v2-mono v2-muted wp8a-key">money_provider</span>
                <div className="d">Razorpay handles real payments. “Simulated” only fakes them for tests.</div>
              </div>
              <v2.Pill tone="wait">{provider}</v2.Pill>
            </div>
          </v2.Card>
        </div>
        <SwitchHistory rows={history.rows} error={history.error} />
      </v2.Grid>
    </>
  );
}
