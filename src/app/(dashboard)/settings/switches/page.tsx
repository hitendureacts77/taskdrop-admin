import { SwitchesView } from '@/components/views/AdminConfigViews';
import { setSwitch } from '@/lib/admin-actions';
import { getSwitches } from '@/lib/admin-config';
import { requireAdmin } from '@/lib/data';

export default async function SwitchesPage() {
  await requireAdmin();
  const { switches, payoutMethod } = await getSwitches();
  return <SwitchesView switches={switches} payoutMethod={payoutMethod} update={setSwitch} />;
}
