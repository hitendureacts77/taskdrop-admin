import { SupportView } from '@/components/views/QueuesViews';
import { SupportListV2, type TicketTab } from '@/components/v2/safety/SupportV2';
import { countTickets, getTickets, requireAdmin } from '@/lib/data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Help requests' };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SupportPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const s = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = s === 'answered' || s === 'resolved' || s === 'all' ? s : 'waiting';
  if (await getV2()) {
    const hide = await getHideTestData();
    const tabs: TicketTab[] = ['waiting', 'answered', 'resolved', 'all'];
    const [rows, ...counts] = await Promise.all([getTickets(status, hide), ...tabs.map((t) => countTickets(t, hide))]);
    const byTab = Object.fromEntries(tabs.map((t, i) => [t, counts[i]])) as Record<TicketTab, number | null>;
    return <SupportListV2 rows={rows} counts={byTab} status={status} now={new Date().toISOString()} />;
  }
  const [rows, total] = await Promise.all([getTickets(status), countTickets(status)]);
  return <SupportView rows={rows} total={total} status={status} now={new Date().toISOString()} />;
}
