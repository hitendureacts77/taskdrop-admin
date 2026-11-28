import { LeadsView } from '@/components/views/LeadsView';
import { LeadsV2 } from '@/components/v2/crm/Leads';
import { parseLeadFilter } from '@/lib/crm-calc';
import { requireAdmin } from '@/lib/data';
import { getStaffList } from '@/lib/growth';
import { getLeads } from '@/lib/leads';
import { staffCan } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Leads' };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const filter = parseLeadFilter(await searchParams);
  const [leads, staff] = await Promise.all([getLeads(me.staffRole), getStaffList()]);
  if (await getV2()) {
    // Who may edit is shown by the v2 buttons (roles.ts); the lead actions check it again on the server.
    return <LeadsV2 d={{ leads, filter, staff, me: me.id, now: new Date().toISOString(), hideTest: await getHideTestData() }} />;
  }
  return <LeadsView d={{ leads, filter, staff, me: me.id, canEdit: staffCan(me.staffRole, 'people'), now: new Date().toISOString() }} />;
}
