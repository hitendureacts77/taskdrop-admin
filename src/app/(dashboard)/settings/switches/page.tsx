import { SwitchesView } from '@/components/views/AdminConfigViews';
import { setSwitch } from '@/lib/admin-actions';
import { getSwitches } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';

export default async function SwitchesPage() {
  await requireSeeing('settings');
  const { switches, payoutMethod } = await getSwitches();
  return <SwitchesView switches={switches} payoutMethod={payoutMethod} update={setSwitch} />;
}
