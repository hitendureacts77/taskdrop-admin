import { FollowUpsView } from '@/components/views/CrmGrowthViews';
import { requireAdmin } from '@/lib/data';
import { getFollowUps, getPipeline, getStaffList } from '@/lib/growth';

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireAdmin();
  const v = (await searchParams).view;
  const view = v === 'all' || v === 'done' ? v : 'mine';
  const [items, pipeline, staff] = await Promise.all([getFollowUps(view, me.id), getPipeline(), getStaffList()]);
  return <FollowUpsView view={view} items={items} pipeline={pipeline} staff={staff} me={me.id} now={new Date().toISOString()} />;
}
