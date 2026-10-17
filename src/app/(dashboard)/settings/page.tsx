import { SettingsView } from '@/components/views/MoreViews';
import { updateSetting } from '@/lib/actions';
import { staffCan } from '@/lib/staff-roles';
import { getAllSettings, requireSeeing } from '@/lib/data';

export default async function SettingsPage() {
  const me = await requireSeeing('settings');
  const rows = await getAllSettings();
  return <SettingsView rows={rows} update={staffCan(me.staffRole, 'admin') ? updateSetting : undefined} />;
}
