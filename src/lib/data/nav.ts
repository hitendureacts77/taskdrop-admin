import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import { getRefundsOwed } from './money';

// -------------------------------------------------------------- nav counts --

export type NavCounts = { payouts: number; disputes: number; refunds: number; support: number };

/** The little numbers in the sidebar. Never throws: a missing count shows as nothing. */
export async function getNavCounts(): Promise<NavCounts> {
  const out: NavCounts = { payouts: 0, disputes: 0, refunds: 0, support: 0 };
  const supabase = await createSessionClient();
  await Promise.allSettled([
    (async () => {
      // Only withdrawals that need a person: paid by hand, held by RazorpayX
      // for balance or approval, or not with RazorpayX ten minutes after asking.
      const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
      const needsYou = await supabase
        .from('payouts')
        .select('id', { count: 'exact', head: true })
        .in('status', ['requested', 'processing'])
        .or(`via.eq.manual,provider_status.in.(queued,pending),and(provider_payout_id.is.null,created_at.lt.${tenMinAgo})`);
      if (!needsYou.error) {
        out.payouts = needsYou.count ?? 0;
        return;
      }
      // Before migration 066: every open withdrawal needed a person.
      const { count } = await supabase.from('payouts').select('id', { count: 'exact', head: true }).in('status', ['requested', 'processing']);
      out.payouts = count ?? 0;
    })(),
    (async () => {
      const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED');
      out.disputes = count ?? 0;
    })(),
    (async () => {
      const { count } = await supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'waiting');
      out.support = count ?? 0;
    })(),
    (async () => {
      const refunds = await getRefundsOwed();
      out.refunds = refunds?.length ?? 0;
    })(),
  ]);
  return out;
}
