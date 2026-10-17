import { PromotionsView } from '@/components/views/MoreViews';
import { stopPromotion } from '@/lib/actions';
import { getPromotions, requireSeeing } from '@/lib/data';
import { staffCan } from '@/lib/staff-roles';

export default async function PromotionsPage() {
  const me = await requireSeeing('money');
  const rows = await getPromotions(100);
  return <PromotionsView rows={rows} stop={staffCan(me.staffRole, 'money') ? stopPromotion : undefined} />;
}
