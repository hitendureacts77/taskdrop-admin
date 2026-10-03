import { SupportView } from '@/components/views/QueuesViews';
import { getTickets, requireAdmin } from '@/lib/data';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SupportPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const s = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = s === 'answered' || s === 'resolved' || s === 'all' ? s : 'waiting';
  const rows = await getTickets(status);
  return <SupportView rows={rows} status={status} now={new Date().toISOString()} />;
}
