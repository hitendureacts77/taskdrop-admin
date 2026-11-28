import { SettingsView } from '@/components/views/MoreViews';
import { MoneyTimingV2 } from '@/components/v2/settings/MoneyTimingV2';
import { updateSetting } from '@/lib/actions';
import { staffCan } from '@/lib/staff-roles';
import { getAllSettings, requireSeeing } from '@/lib/data';
import { getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Money and timing' };

export default async function SettingsPage() {
  const me = await requireSeeing('settings');
  const [rows, v2] = await Promise.all([getAllSettings(), getV2()]);
  if (v2) {
    // The Confirm button locks for non-Admin roles; updateSetting refuses them on the server anyway.
    const serverIdle = Math.max(1, Number(process.env.ADMIN_IDLE_MINUTES) || 30);
    return <MoneyTimingV2 rows={rows} role={me.staffRole} update={updateSetting} serverIdle={serverIdle} />;
  }
  return <SettingsView rows={rows} update={staffCan(me.staffRole, 'admin') ? updateSetting : undefined} />;
}
