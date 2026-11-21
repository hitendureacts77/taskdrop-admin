import { SwitchesView } from '@/components/views/AdminConfigViews';
import { setSwitch } from '@/lib/admin-actions';
import { getSwitches, getTeam } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';
import { mfaState } from '@/lib/mfa';
import { mfaSwitchCheck } from '@/lib/mfa-switch';
import { staffCan } from '@/lib/staff-roles';

export const metadata = { title: 'App switches' };

export default async function SwitchesPage() {
  const me = await requireSeeing('settings');
  const [{ switches, payoutMethod }, team, mine] = await Promise.all([getSwitches(), getTeam(me.staffRole), mfaState()]);
  // Who has an authenticator, so turning the money code on can warn or refuse first (B112).
  const known = team.every((m) => m.authenticator !== null);
  const mfaGuard = mfaSwitchCheck({
    turningOn: true,
    meEnrolled: mine.enrolled,
    withMfa: known ? team.filter((m) => m.authenticator).length : null,
    total: team.length,
  });
  // A role that may not change switches sees them read-only; setSwitch refuses it on the server anyway (B133).
  return <SwitchesView switches={switches} payoutMethod={payoutMethod} mfaGuard={mfaGuard} update={staffCan(me.staffRole, 'admin') ? setSwitch : undefined} />;
}
