import { TeamView } from '@/components/views/AdminConfigViews';
import { addAdmin, removeAdmin, setStaffNotify, setStaffRole } from '@/lib/admin-actions';
import { getTeam } from '@/lib/admin-config';
import { adminAllowlist } from '@/lib/auth';
import { hasServiceKey, requireSeeing } from '@/lib/data';

export default async function TeamPage() {
  const me = await requireSeeing('settings');
  const team = await getTeam();
  return (
    <TeamView
      team={team}
      meId={me.id}
      meRole={me.staffRole}
      allowlist={adminAllowlist()}
      serviceKey={hasServiceKey()}
      add={addAdmin}
      remove={removeAdmin}
      setRole={setStaffRole}
      setNotify={setStaffNotify}
    />
  );
}
