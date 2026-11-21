import { CopyrightView } from '@/components/views/CopyrightView';
import { getCopyrightNotices } from '@/lib/copyright';
import { requireAdmin } from '@/lib/data';
import { staffCan } from '@/lib/staff-roles';

export const metadata = { title: 'Copyright notices' };

export default async function CopyrightPage() {
  const me = await requireAdmin();
  const { ready, rows } = await getCopyrightNotices(me.staffRole);
  // View-only roles get no buttons; the copyright actions refuse them on the server anyway (B133).
  return <CopyrightView ready={ready} rows={rows} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
}
