import { SwitchesView } from '@/components/views/AdminConfigViews';
import { SwitchesV2 } from '@/components/v2/settings/SwitchesV2';
import { setSwitch } from '@/lib/admin-actions';
import { getSwitches, getTeam } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';
import { getSettingValues, getSwitchHistory } from '@/lib/data/settings';
import { mfaState } from '@/lib/mfa';
import { mfaSwitchCheck } from '@/lib/mfa-switch';
import { staffCan } from '@/lib/staff-roles';
import { getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'App switches' };

export default async function SwitchesPage() {
  const me = await requireSeeing('settings');
  const [{ switches, payoutMethod }, team, mine, v2] = await Promise.all([getSwitches(), getTeam(me.staffRole), mfaState(), getV2()]);
  // Who has an authenticator, so turning the money code on can warn or refuse first (B112).
  const known = team.every((m) => m.authenticator !== null);
  if (v2) {
    const [money, history] = await Promise.all([getSettingValues(['money_paused', 'money_flow', 'money_provider']), getSwitchHistory()]);
    return (
      <SwitchesV2
        role={me.staffRole}
        switches={switches}
        payoutMethod={payoutMethod}
        withMfa={known ? team.filter((m) => m.authenticator).length : null}
        team={team.length}
        money={{ money_paused: money.money_paused ?? null, money_flow: money.money_flow ?? null, money_provider: money.money_provider ?? null }}
        history={history}
      />
    );
  }
  const mfaGuard = mfaSwitchCheck({
    turningOn: true,
    meEnrolled: mine.enrolled,
    withMfa: known ? team.filter((m) => m.authenticator).length : null,
    total: team.length,
  });
  // A role that may not change switches sees them read-only; setSwitch refuses it on the server anyway (B133).
  return <SwitchesView switches={switches} payoutMethod={payoutMethod} mfaGuard={mfaGuard} update={staffCan(me.staffRole, 'admin') ? setSwitch : undefined} />;
}
