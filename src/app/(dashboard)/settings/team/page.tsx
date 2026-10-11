import { TeamView } from '@/components/views/AdminConfigViews';
import { addAdmin, removeAdmin } from '@/lib/admin-actions';
import { getTeam } from '@/lib/admin-config';
import { adminAllowlist } from '@/lib/auth';
import { hasServiceKey, requireAdmin } from '@/lib/data';

export default async function TeamPage() {
  const me = await requireAdmin();
  const team = await getTeam();
  return <TeamView team={team} meId={me.id} allowlist={adminAllowlist()} serviceKey={hasServiceKey()} add={addAdmin} remove={removeAdmin} />;
}
