import { HealthView } from '@/components/views/AdminConfigViews';
import { HealthV2 } from '@/components/v2/settings-tools/HealthV2';
import { getHealth } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';
import { getRawEnvironment } from '@/lib/environment-server';
import { getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'System health' };

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const me = await requireSeeing('settings');
  if (await getV2()) {
    const [h, appEnv] = await Promise.all([getHealth(), getRawEnvironment()]);
    return <HealthV2 h={h} role={me.staffRole} appEnv={appEnv} />;
  }
  return <HealthView h={await getHealth()} />;
}
