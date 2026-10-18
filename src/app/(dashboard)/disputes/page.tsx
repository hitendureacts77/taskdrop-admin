import { DisputesView } from '@/components/views/QueuesViews';
import { getDisputes, requireSeeing } from '@/lib/data';

export default async function DisputesPage() {
  await requireSeeing('money');
  const rows = await getDisputes();
  return <DisputesView rows={rows} now={new Date().toISOString()} />;
}
