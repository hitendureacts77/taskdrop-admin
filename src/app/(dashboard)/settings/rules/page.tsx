import { RulesView } from '@/components/views/RulesViews';
import { requireSeeing } from '@/lib/data';
import { getRules } from '@/lib/rules';
import { staffCan } from '@/lib/staff-roles';

export default async function RulesPage() {
  const me = await requireSeeing('settings');
  const rules = await getRules();
  return <RulesView rules={rules} canEdit={staffCan(me.staffRole, 'admin')} role={me.staffRole} now={new Date().toISOString()} />;
}
