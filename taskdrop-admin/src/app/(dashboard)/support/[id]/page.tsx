import { notFound } from 'next/navigation';
import { TicketView } from '@/components/views/QueuesViews';
import { replyTicket, resolveTicket } from '@/lib/actions';
import { getTicket, requireAdmin } from '@/lib/data';

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();
  return <TicketView t={ticket} reply={replyTicket} resolve={resolveTicket} />;
}
