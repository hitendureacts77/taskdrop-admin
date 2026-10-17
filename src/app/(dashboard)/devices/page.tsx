import { DevicesView } from '@/components/views/DevicesView';
import { getAppControls } from '@/lib/controls';
import { requireAdmin } from '@/lib/data';
import { minVersionFor } from '@/lib/devices-calc';
import { getDevicesSummary } from '@/lib/ops';

export const dynamic = 'force-dynamic';

const text = (r: Record<string, unknown> | null | undefined, k: string) => (typeof r?.[k] === 'string' ? (r[k] as string) : null);

/** Read-only for every staff role. */
export default async function DevicesPage() {
  await requireAdmin();
  const [devices, controls] = await Promise.all([getDevicesSummary(), getAppControls()]);
  // The minimum version that applies to a platform is the higher of the Everywhere row and its own row.
  const all = text(controls.rows.all, 'min_version');
  const minByPlatform: Record<string, string | null> = {};
  for (const p of ['web', 'android', 'ios'] as const) minByPlatform[p] = minVersionFor(all, text(controls.rows[p], 'min_version'));
  minByPlatform.windows = all;
  minByPlatform.macos = all;
  return <DevicesView devices={devices} minByPlatform={minByPlatform} now={new Date().toISOString()} />;
}
