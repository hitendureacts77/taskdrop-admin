import Link from 'next/link';
import type { MoneyHeld } from '@/lib/data';
import { CHART_COLORS } from '@/lib/labels';
import { Money, StackBar, Swatch } from './ui';

/**
 * Everything in TaskDrop's one bank account, split by who it belongs to. Only
 * the first line is TaskDrop's; the rest is held for posters and workers.
 */
export function WhoseMoney({
  ownMinor,
  escrowMinor,
  held,
  queueMinor,
  clearingDays,
}: {
  ownMinor: number;
  escrowMinor: number;
  held: MoneyHeld;
  queueMinor: number;
  clearingDays: number;
}) {
  const rows = [
    {
      label: "TaskDrop's own earnings",
      hint: 'Yours. Everything TaskDrop has earned since the start. Money you have moved out and Razorpay’s fees aren’t tracked here, so the bank balance will be lower by those.',
      value: ownMinor,
      color: CHART_COLORS.total,
      href: '/money',
    },
    { label: 'Posters’ money held for jobs (escrow)', hint: 'Not yours yet. Released to the worker when the poster approves.', value: escrowMinor, color: CHART_COLORS.escrow, href: '/tasks?filter=escrow' },
    { label: 'Earnings, ready to withdraw', hint: 'Workers’ earnings. Theirs to withdraw any time; RazorpayX sends it.', value: held.walletBalances, color: '#2F5BEA', href: '/users?filter=money' },
    ...(held.credits
      ? [{ label: 'Posters’ wallet money', hint: 'Top-ups and refunds. Spent on jobs only; it can’t be withdrawn.', value: held.credits, color: '#5B7BE0', href: '/users?filter=money' }]
      : []),
    { label: 'Workers’ earnings still clearing', hint: `The workers’. Can be withdrawn ${clearingDays} days after a job is approved.`, value: held.clearing, color: '#8FA8F5', href: '/users?filter=money' },
    { label: 'Withdrawals on their way', hint: 'The workers’. Already out of their wallets; RazorpayX is sending them.', value: queueMinor, color: '#E0724A', href: '/payouts' },
    ...(held.refundsOwed !== null
      ? [{ label: 'Refunds owed to posters', hint: 'The posters’. From cancelled jobs.', value: held.refundsOwed, color: '#E0A85A', href: '/refunds' }]
      : []),
  ];
  const total = rows.reduce((a, r) => a + r.value, 0);
  const notOurs = total - ownMinor;

  return (
    <div className="whose-block">
      <div className="whose-total">
        <Money minor={total} className="big-num" />
        <span className="muted">
          in total before anything is moved out, of which <Money minor={notOurs} /> belongs to posters and workers
        </span>
      </div>
      <StackBar label="Money in TaskDrop's account, by owner" parts={rows.map((r) => ({ value: r.value, color: r.color, label: r.label }))} />
      <ul className="whose">
        {rows.map((r) => (
          <li key={r.label}>
            <Link href={r.href} className="whose-row">
              <Swatch color={r.color} />
              <span className="whose-text">
                <strong>{r.label}</strong>
                <span>{r.hint}</span>
              </span>
              <Money minor={r.value} />
            </Link>
          </li>
        ))}
      </ul>
      {held.refundsOwed === null ? (
        <p className="muted small">Refunds owed to posters aren’t counted: reading them needs SUPABASE_SERVICE_ROLE_KEY on the server.</p>
      ) : null}
    </div>
  );
}
