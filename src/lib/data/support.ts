import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { namesFor } from './people';
import { isUuid } from './tasks';

// ----------------------------------------------------------------- support --

export type TicketRow = { id: string; subject: string; category: string; status: string; userId: string; user: string; createdAt: string; updatedAt: string };

export async function getTickets(status: 'waiting' | 'answered' | 'resolved' | 'all'): Promise<TicketRow[]> {
  const supabase = await createSessionClient();
  let q = supabase
    .from('support_tickets')
    .select('id, subject, category, status, user_id, created_at, updated_at')
    .order('updated_at', { ascending: status === 'waiting' })
    .limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(`Could not read help requests: ${error.message}`);
  const rows = (data ?? []) as { id: string; subject: string; category: string; status: string; user_id: string; created_at: string; updated_at: string }[];
  const names = await namesFor(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    category: r.category,
    status: r.status,
    userId: r.user_id,
    user: names.get(r.user_id) ?? 'Someone',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export type TicketDetail = TicketRow & { page: string | null; messages: { id: string; body: string; fromStaff: boolean; author: string; createdAt: string }[] };

export async function getTicket(id: string): Promise<TicketDetail | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSessionClient();
  const { data: t } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, user_id, page, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (!t) return null;
  const ticket = t as { id: string; subject: string; category: string; status: string; user_id: string; page: string | null; created_at: string; updated_at: string };
  // support_messages: id, ticket_id, sender_id, from_staff, body, created_at.
  // Read untyped in case the generated types predate the table.
  type Untyped = {
    from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => PromiseLike<{ data: unknown }> } } };
  };
  const { data: msgs } = await (supabase as unknown as Untyped)
    .from('support_messages')
    .select('id, sender_id, from_staff, body, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });
  const rows = (msgs ?? []) as { id: string; sender_id: string | null; from_staff: boolean; body: string; created_at: string }[];
  const names = await namesFor([ticket.user_id, ...rows.map((m) => m.sender_id ?? '')]);
  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    userId: ticket.user_id,
    user: names.get(ticket.user_id) ?? 'Someone',
    page: ticket.page,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    messages: rows.map((m) => ({
      id: m.id,
      body: m.body,
      fromStaff: Boolean(m.from_staff),
      author: m.from_staff ? 'TaskDrop support' : (m.sender_id && names.get(m.sender_id)) || names.get(ticket.user_id) || 'Them',
      createdAt: m.created_at,
    })),
  };
}
