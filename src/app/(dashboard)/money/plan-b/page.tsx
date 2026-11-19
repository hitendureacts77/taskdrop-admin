import { PlanBView } from '@/components/views/PlanBView';
import { requireSeeing } from '@/lib/data';
import { getPlanBOverview } from '@/lib/plan-b';
import { retryPlanBMove, setMoneyPaused } from '@/lib/plan-b-actions';
import { roleLabel, staffCan } from '@/lib/staff-roles';

export const metadata = { title: 'Plan B money' };

export default async function PlanBPage() {
  const me = await requireSeeing('money');
  const read = await getPlanBOverview();
  const refusal = `Your staff role (${roleLabel(me.staffRole)}) can’t do this. Ask a full admin.`;
  return <PlanBView read={read} refusal={refusal} canPause={staffCan(me.staffRole, 'admin')} setPaused={setMoneyPaused} retryMove={retryPlanBMove} />;
}
