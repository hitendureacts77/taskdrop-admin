import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDisputes, getPayoutQueue, getRefundsOwed, getTickets } from './data';
import { PAYOUT_STAGE, payoutStage } from './labels';
import { copyrightNeed, disputeNeed, helpNeed, payoutNeed, refundNeed, type NeedsItem } from './needs-you';
import { createClient as createSessionClient } from './supabase/server';

/**
 * Everything waiting on a person, from the same reads the Payouts, Refunds,
 * Disputes, Help requests and Copyright pages use, so this list can never
 * disagree with them. Ranking and deadlines are in needs-you.ts.
 *
 * One source failing never hides the others: its items are simply missing and
 * the rest are shown. Null only when every source failed (the caller then keeps
 * whatever it showed before).
 */

/** Waiting copyright notices: lean on purpose (this runs every minute per open panel). */
async function waitingNotices(): Promise<NeedsItem[]> {
  // Newer than the generated types.
  const db = (await createSessionClient()) as unknown as SupabaseClient;
  const { data, error } = await db
    .from('copyright_notices')
    .select('id, received_at, complainant, work')
    .eq('status', 'received')
    .order('received_at', { ascending: true })
    .limit(200);
  // Before migration 085 the table doesn't exist: nothing is waiting.
  if (error) return [];
  return ((data ?? []) as { id: string; received_at: string; complainant: string | null; work: string | null }[]).map((n) =>
    copyrightNeed({ id: n.id, complainant: n.complainant, work: n.work, since: n.received_at }),
  );
}

export async function getNeedsYou(): Promise<NeedsItem[] | null> {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const [payouts, refunds, disputes, tickets, notices] = await Promise.allSettled([
    getPayoutQueue(),
    getRefundsOwed(),
    getDisputes(),
    getTickets('waiting'),
    waitingNotices(),
  ]);
  if ([payouts, refunds, disputes, tickets, notices].every((r) => r.status === 'rejected')) return null;

  const items: NeedsItem[] = [];

  if (payouts.status === 'fulfilled') {
    for (const p of payouts.value) {
      const stage = payoutStage(p, nowMs);
      if (!PAYOUT_STAGE[stage].needsYou) continue;
      items.push(payoutNeed({ id: p.id, name: p.display_name, amountMinor: p.amount_minor, since: p.requested_at, stageLabel: PAYOUT_STAGE[stage].label }));
    }
  }
  // Null without the service key: refunds can't be listed, so none are claimed.
  if (refunds.status === 'fulfilled' && refunds.value) {
    for (const r of refunds.value) {
      items.push(refundNeed({ taskId: r.taskId, poster: r.poster, dueMinor: r.dueMinor, title: r.title, since: r.cancelledAt }, nowIso));
    }
  }
  if (disputes.status === 'fulfilled') {
    for (const d of disputes.value) {
      items.push(
        disputeNeed({
          taskId: d.taskId,
          title: d.title,
          poster: d.poster,
          worker: d.worker,
          // Nothing is frozen if the poster never paid.
          frozenMinor: d.funded ? d.escrowMinor || d.lockedMinor : 0,
          since: d.since,
        }),
      );
    }
  }
  if (tickets.status === 'fulfilled') {
    for (const t of tickets.value) items.push(helpNeed({ id: t.id, user: t.user, subject: t.subject, since: t.updatedAt }));
  }
  if (notices.status === 'fulfilled') items.push(...notices.value);

  return items;
}
