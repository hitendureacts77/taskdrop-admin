import { PromotionsView } from '@/components/views/MoreViews';
import { getPromotions, requireAdmin } from '@/lib/data';

export default async function PromotionsPage() {
  await requireAdmin();
  const rows = await getPromotions(100);
  return <PromotionsView rows={rows} />;
}
