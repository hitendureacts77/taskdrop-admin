import { HealthView } from '@/components/views/AdminConfigViews';
import { getHealth } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  await requireSeeing('settings');
  return <HealthView h={await getHealth()} />;
}
