import { LeadsView } from '@/components/views/LeadsView';
import { parseLeadFilter } from '@/lib/crm-calc';
import { requireAdmin } from '@/lib/data';
import { getStaffList } from '@/lib/growth';
import { getLeads } from '@/lib/leads';
import { staffCan } from '@/lib/staff-roles';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const filter = parseLeadFilter(await searchParams);
  const [leads, staff] = await Promise.all([getLeads(), getStaffList()]);
  return <LeadsView d={{ leads, filter, staff, me: me.id, canEdit: staffCan(me.staffRole, 'people'), now: new Date().toISOString() }} />;
}
