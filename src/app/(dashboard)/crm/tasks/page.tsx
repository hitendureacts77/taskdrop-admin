import { FollowUpsView } from '@/components/views/CrmGrowthViews';
import { FollowUpsV2 } from '@/components/v2/crm/FollowUps';
import { requireAdmin } from '@/lib/data';
import { getFollowUps, getPipeline, getStaffList } from '@/lib/growth';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Follow-ups and pipeline' };

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireAdmin();
  const v = (await searchParams).view;
  const view = v === 'all' || v === 'done' ? v : 'mine';
  const [items, pipeline, staff] = await Promise.all([getFollowUps(view, me.id), getPipeline(), getStaffList()]);
  if (await getV2()) {
    return <FollowUpsV2 view={view} items={items} pipeline={pipeline} staff={staff} me={me.id} now={new Date().toISOString()} hideTest={await getHideTestData()} />;
  }
  return <FollowUpsView view={view} items={items} pipeline={pipeline} staff={staff} me={me.id} now={new Date().toISOString()} />;
}
