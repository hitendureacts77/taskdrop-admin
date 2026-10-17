import { ControlsView } from '@/components/views/ControlsView';
import { getAppControls, getDeviceRows } from '@/lib/controls';
import { requireSeeing } from '@/lib/data';

export default async function ControlsPage() {
  await requireSeeing('settings');
  const [controls, devices] = await Promise.all([getAppControls(), getDeviceRows()]);
  return <ControlsView controls={controls} devices={devices} now={new Date().toISOString()} />;
}
