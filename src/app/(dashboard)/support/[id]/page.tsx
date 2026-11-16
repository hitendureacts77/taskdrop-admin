import { notFound } from 'next/navigation';
import { TicketView } from '@/components/views/QueuesViews';
import { replyTicket, resolveTicket } from '@/lib/actions';
import { getTicket, requireAdmin } from '@/lib/data';
import { staffCan } from '@/lib/staff-roles';

export const metadata = { title: 'Help request' };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();
  // Read-only for a role that may not answer; both actions refuse it on the server anyway (B133).
  const answers = staffCan(me.staffRole, 'people');
  return <TicketView t={ticket} reply={answers ? replyTicket : undefined} resolve={answers ? resolveTicket : undefined} />;
}
