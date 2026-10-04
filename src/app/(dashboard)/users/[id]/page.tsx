import { notFound } from 'next/navigation';
import { UserView } from '@/components/views/UserView';
import { getPersonCrm, getTimeline } from '@/lib/crm';
import { getMoneySettings, getUser, requireAdmin } from '@/lib/data';

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [user, settings] = await Promise.all([getUser(id), getMoneySettings()]);
  if (!user) notFound();
  const [crm, timeline] = await Promise.all([getPersonCrm(id), getTimeline(id, user.joinedAt)]);
  return <UserView u={user} settings={settings} now={new Date().toISOString()} crm={crm} timeline={timeline} />;
}
