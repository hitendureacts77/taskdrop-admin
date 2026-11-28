import { CrmHubView } from '@/components/views/CrmViews';
import { CrmHubV2 } from '@/components/v2/crm/Hub';
import { getCrmOverview } from '@/lib/crm';
import { requireAdmin } from '@/lib/data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Customer hub' };

export default async function CrmPage() {
  await requireAdmin();
  if (await getV2()) {
    const hideTest = await getHideTestData();
    const overview = await getCrmOverview({ hideTest });
    return <CrmHubV2 o={overview} now={new Date().toISOString()} hideTest={hideTest} />;
  }
  const overview = await getCrmOverview();
  return <CrmHubView o={overview} now={new Date().toISOString()} />;
}
