import { SettingsView } from '@/components/views/MoreViews';
import { updateSetting } from '@/lib/actions';
import { getAllSettings, requireAdmin } from '@/lib/data';

export default async function SettingsPage() {
  await requireAdmin();
  const rows = await getAllSettings();
  return <SettingsView rows={rows} update={updateSetting} />;
}
