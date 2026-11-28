import Link from 'next/link';
import type { MoneyHeld } from '@/lib/data';
import { inr } from '@/lib/format';

/**
 * Admin v2 "Whose money is in TaskDrop's account": the same lines as today's
 * WhoseMoney (only the first is TaskDrop's), as a stack bar plus one linked
 * bar per owner. Refunds owed read "can't be counted right now" when the
 * server can't read them.
 */
export function V2WhoseMoney({
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
  const rows: { label: string; hint: string; value: number | null; color: string; href: string }[] = [
    { label: 'TaskDrop’s own earnings', hint: 'Commission, service fees and promotions since the start.', value: ownMinor, color: 'var(--jade)', href: '/money/entries' },
    { label: 'Posters’ money held for jobs (escrow)', hint: 'Paid in, not released yet.', value: escrowMinor, color: 'var(--gold)', href: '/tasks?filter=escrow' },
    { label: 'Earnings, ready to withdraw', hint: 'Workers can ask for this now.', value: held.walletBalances, color: 'var(--blue)', href: '/users?filter=money' },
    { label: 'Posters’ wallet credits', hint: 'Top-ups and refunds kept as credit; spent on jobs only.', value: held.credits, color: '#8a7bd8', href: '/users?filter=money' },
    { label: 'Workers’ earnings still clearing', hint: `Withdrawable ${clearingDays} days after approval.`, value: held.clearing, color: '#7aa7c7', href: '/users?filter=money' },
    { label: 'Withdrawals on their way', hint: 'Out of earnings, not sent yet.', value: queueMinor, color: 'var(--orange)', href: '/payouts' },
    { label: 'Refunds owed to posters', hint: 'From cancelled jobs.', value: held.refundsOwed, color: 'var(--red)', href: '/refunds' },
  ];
  const total = rows.reduce((a, r) => a + (r.value ?? 0), 0);
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));

  return (
    <div>
      <div className="v2-muted wp4-small">In TaskDrop’s account right now</div>
      <div className="wp4-bignum">{inr(total)}</div>
      <div className="v2-muted wp4-small">of which {inr(total - ownMinor)} belongs to posters and workers</div>
      <div className="wp4-stack" role="img" aria-label="Money in TaskDrop's account, by owner">
        {rows.map((r) => (r.value && r.value > 0 && total > 0 ? <span key={r.label} title={r.label} style={{ width: `${(r.value / total) * 100}%`, background: r.color }} /> : null))}
      </div>
      {rows.map((r) => (
        <Link key={r.label} className="wp4-hbar" href={r.href}>
          <span className="l" title={r.hint}>
            <i className="sw" style={{ background: r.color }} aria-hidden="true" /> {r.label}
          </span>
          <span className="tr" aria-hidden="true">
            <span className="fi" style={{ width: `${r.value && r.value > 0 ? Math.max(2, (r.value / max) * 100) : 0}%`, background: r.color }} />
          </span>
          <span className="v">{r.value === null ? 'Can’t be counted right now' : inr(r.value)}</span>
        </Link>
      ))}
      {held.refundsOwed === null ? <p className="v2-muted wp4-small">Refunds owed can’t be counted right now: the server key that reads them is not set on this server.</p> : null}
    </div>
  );
}
