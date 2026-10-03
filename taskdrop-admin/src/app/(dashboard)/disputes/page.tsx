import { DisputesView } from '@/components/views/QueuesViews';
import { getDisputes, requireAdmin } from '@/lib/data';

export default async function DisputesPage() {
  await requireAdmin();
  const rows = await getDisputes();
  return <DisputesView rows={rows} now={new Date().toISOString()} />;
}
