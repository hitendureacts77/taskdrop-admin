import { TeamView } from '@/components/views/AdminConfigViews';
import { TeamV2 } from '@/components/v2/settings/TeamV2';
import { addAdmin, removeAdmin, setStaffNotify, setStaffRole } from '@/lib/admin-actions';
import { getTeam } from '@/lib/admin-config';
import { endAllStaffSessions } from '@/lib/session-actions';
import { adminAllowlist } from '@/lib/auth';
import { hasServiceKey, requireSeeing } from '@/lib/data';
import { isTestUserId } from '@/lib/test-data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Team and roles' };

export default async function TeamPage() {
  const me = await requireSeeing('settings');
  const [team, v2] = await Promise.all([getTeam(me.staffRole), getV2()]);
  if (v2) {
    const hide = await getHideTestData();
    return (
      <TeamV2
        team={hide ? team.filter((m) => !isTestUserId(m.id)) : team}
        meId={me.id}
        role={me.staffRole}
        allowlist={adminAllowlist()}
        serviceKey={hasServiceKey()}
        add={addAdmin}
        remove={removeAdmin}
        setRole={setStaffRole}
        setNotify={setStaffNotify}
        endAll={endAllStaffSessions}
      />
    );
  }
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
      endAll={endAllStaffSessions}
    />
  );
}
