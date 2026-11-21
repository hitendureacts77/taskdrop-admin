import 'server-only';
import { requireAdmin } from './data';
import { securityEvent } from './security-event';
import { roleLabel, staffCan, type StaffArea } from './staff-roles';

/** null when the signed-in admin's staff role may change things in this area; otherwise the sentence to show. */
export async function staffGate(area: StaffArea): Promise<string | null> {
  const me = await requireAdmin();
  if (staffCan(me.staffRole, area)) return null;
  // The page should not have offered this button (B133), so a refusal is worth a look (B127).
  securityEvent('staff_gate_refused', { role: me.staffRole, area, staff: me.id });
  return `Your staff role (${roleLabel(me.staffRole)}) can’t do this. Ask a full admin.`;
}
