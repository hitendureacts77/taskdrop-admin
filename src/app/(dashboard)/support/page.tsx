import { SupportView } from '@/components/views/QueuesViews';
import { countTickets, getTickets, requireAdmin } from '@/lib/data';

export const metadata = { title: 'Help requests' };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SupportPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const s = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = s === 'answered' || s === 'resolved' || s === 'all' ? s : 'waiting';
  const [rows, total] = await Promise.all([getTickets(status), countTickets(status)]);
  return <SupportView rows={rows} total={total} status={status} now={new Date().toISOString()} />;
}
