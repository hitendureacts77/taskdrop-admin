import { ControlsView } from '@/components/views/ControlsView';
import { getAppControls, getDeviceRows } from '@/lib/controls';
import { requireAdmin } from '@/lib/data';

export default async function ControlsPage() {
  await requireAdmin();
  const [controls, devices] = await Promise.all([getAppControls(), getDeviceRows()]);
  return <ControlsView controls={controls} devices={devices} now={new Date().toISOString()} />;
}
