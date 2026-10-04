import { CrmHubView } from '@/components/views/CrmViews';
import { getCrmOverview } from '@/lib/crm';
import { requireAdmin } from '@/lib/data';

export default async function CrmPage() {
  await requireAdmin();
  const overview = await getCrmOverview();
  return <CrmHubView o={overview} now={new Date().toISOString()} />;
}
