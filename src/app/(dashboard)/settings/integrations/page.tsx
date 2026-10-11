import { IntegrationsView } from '@/components/views/AdminConfigViews';
import { getIntegrations } from '@/lib/admin-config';
import { requireAdmin } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  await requireAdmin();
  return <IntegrationsView i={await getIntegrations()} />;
}
