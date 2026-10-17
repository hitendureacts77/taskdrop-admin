import { IntegrationsView } from '@/components/views/AdminConfigViews';
import { getIntegrations } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  await requireSeeing('settings');
  return <IntegrationsView i={await getIntegrations()} />;
}
