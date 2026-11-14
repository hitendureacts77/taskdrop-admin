import { SwitchesView } from '@/components/views/AdminConfigViews';
import { setSwitch } from '@/lib/admin-actions';
import { getSwitches } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';
import { staffCan } from '@/lib/staff-roles';

export default async function SwitchesPage() {
  const me = await requireSeeing('settings');
  const { switches, payoutMethod } = await getSwitches();
  // A role that may not change switches sees them read-only; setSwitch refuses it on the server anyway (B133).
  return <SwitchesView switches={switches} payoutMethod={payoutMethod} update={staffCan(me.staffRole, 'admin') ? setSwitch : undefined} />;
}
