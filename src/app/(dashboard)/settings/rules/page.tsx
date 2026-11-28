import { RulesView } from '@/components/views/RulesViews';
import { RulesV2 } from '@/components/v2/settings-tools/RulesV2';
import { requireSeeing } from '@/lib/data';
import { getRules } from '@/lib/rules';
import { staffCan } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Rules' };

export default async function RulesPage() {
  const me = await requireSeeing('settings');
  const rules = await getRules();
  if (await getV2()) {
    return <RulesV2 rules={rules} role={me.staffRole} now={new Date().toISOString()} hideTest={await getHideTestData()} />;
  }
  return <RulesView rules={rules} canEdit={staffCan(me.staffRole, 'admin')} role={me.staffRole} now={new Date().toISOString()} />;
}
