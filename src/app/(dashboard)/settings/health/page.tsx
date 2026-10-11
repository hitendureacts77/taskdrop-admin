import { HealthView } from '@/components/views/AdminConfigViews';
import { getHealth } from '@/lib/admin-config';
import { requireAdmin } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  await requireAdmin();
  return <HealthView h={await getHealth()} />;
}
