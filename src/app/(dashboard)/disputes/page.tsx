import { DisputesView } from '@/components/views/QueuesViews';
import { countDisputes, getDisputes, requireSeeing } from '@/lib/data';

export default async function DisputesPage() {
  await requireSeeing('money');
  const [rows, total] = await Promise.all([getDisputes(), countDisputes()]);
  return <DisputesView rows={rows} total={total} now={new Date().toISOString()} />;
}
