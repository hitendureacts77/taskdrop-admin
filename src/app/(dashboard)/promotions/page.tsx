import { PromotionsView } from '@/components/views/MoreViews';
import { PromotionsV2 } from '@/components/v2/catalog/PromotionsV2';
import { stopPromotion } from '@/lib/actions';
import { getPromotions, requireSeeing } from '@/lib/data';
import { staffCan } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Promotions' };

export default async function PromotionsPage() {
  const me = await requireSeeing('money');
  if (await getV2()) {
    // v2: the Stop button locks itself for roles outside money (Confirm area="money"); stopPromotion checks again.
    const hideTest = await getHideTestData();
    const rows = await getPromotions(100, { hideTest });
    return <PromotionsV2 rows={rows} stop={stopPromotion} hideTest={hideTest} />;
  }
  const rows = await getPromotions(100);
  return <PromotionsView rows={rows} stop={staffCan(me.staffRole, 'money') ? stopPromotion : undefined} />;
}
