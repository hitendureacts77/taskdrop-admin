import { notFound } from 'next/navigation';
import { UserView } from '@/components/views/UserView';
import { getMoneySettings, getUser, requireAdmin } from '@/lib/data';

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [user, settings] = await Promise.all([getUser(id), getMoneySettings()]);
  if (!user) notFound();
  return <UserView u={user} settings={settings} now={new Date().toISOString()} />;
}
