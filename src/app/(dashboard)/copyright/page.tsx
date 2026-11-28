import { CopyrightView } from '@/components/views/CopyrightView';
import { CopyrightV2, isTestNotice } from '@/components/v2/safety/CopyrightV2';
import { getCopyrightNotices } from '@/lib/copyright';
import { requireAdmin } from '@/lib/data';
import { staffCan } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Copyright notices' };

export default async function CopyrightPage() {
  const me = await requireAdmin();
  const { ready, rows } = await getCopyrightNotices(me.staffRole);
  // View-only roles get no buttons; the copyright actions refuse them on the server anyway (B133).
  if (await getV2()) {
    const hide = await getHideTestData();
    return <CopyrightV2 ready={ready} rows={hide ? rows.filter((n) => !isTestNotice(n)) : rows} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
  }
  return <CopyrightView ready={ready} rows={rows} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
}
