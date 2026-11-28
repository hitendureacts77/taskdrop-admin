import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import type { FormAction } from '@/components/ConfirmAction';
import type { PromotionRow } from '@/lib/data';
import { inr, istDate } from '@/lib/format';
import { isTestRow } from '@/lib/test-data';

/**
 * Admin v2 Promotions (WP9, F166–F169). Same data (getPromotions) and the same
 * stopPromotion server action as today. Owner decision 6: stopping keeps
 * "stop and give back the unused part".
 */

const STATUS: Record<string, { label: string; tone: v2.Tone }> = {
  pending: { label: 'Not paid yet', tone: 'wait' },
  active: { label: 'Showing now', tone: 'ok' },
  expired: { label: 'Finished', tone: 'mut' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
};

function runs(r: PromotionRow): string {
  if (!r.startsAt) return 'Not started';
  return `${istDate(r.startsAt)} – ${r.endsAt ? istDate(r.endsAt) : '…'}`;
}

export function PromotionsV2({ rows, stop, hideTest }: { rows: PromotionRow[]; stop: FormAction; hideTest: boolean }) {
  const active = rows.filter((r) => r.status === 'active');
  const paid = rows.filter((r) => r.status === 'active' || r.status === 'expired');
  return (
    <>
      <v2.PageHeader
        title="Promotions"
        sub="Posters paying to show their job higher. What they pay is TaskDrop’s own earnings (the “Promotions” line)."
        crumbs={[{ label: 'Money', href: '/money' }, { label: 'Promotions' }]}
      />
      <v2.Grid cols={2}>
        <v2.Tile
          label="Showing now"
          value={active.length}
          tone="jade"
          foot={
            <>
              promoted {active.length === 1 ? 'job' : 'jobs'} · <a href="#promo-list">see them below →</a>
            </>
          }
        />
        <v2.Tile
          label={`Paid for (latest ${rows.length})`}
          value={inr(paid.reduce((a, r) => a + r.amountMinor, 0))}
          tone="gold"
          foot={<Link href="/money/entries?when=all&kind=ad_revenue">Promotion earnings →</Link>}
        />
      </v2.Grid>
      <div className="wp9-mt" id="promo-list">
        <v2.Card title="Latest promotions" sub="The latest 100, newest first. Stopping one gives the unused part back to the poster’s wallet.">
          <v2.DataTable
            caption="Latest promotions"
            columns={[{ label: 'Job' }, { label: 'Paid by' }, { label: 'Amount', right: true }, { label: 'For' }, { label: 'Status' }, { label: 'Runs' }, { label: '' }]}
            empty="No promotions yet"
            rows={rows.map((r) => {
              const st = STATUS[r.status] ?? { label: 'Other', tone: 'mut' as const };
              const canStop = r.status === 'active' || r.status === 'pending';
              return {
                key: r.id,
                href: `/tasks/${r.taskId}`,
                test: !hideTest && isTestRow({ userId: r.userId, title: r.title }),
                cells: [
                  r.title,
                  <Link key="u" href={`/users/${r.userId}`}>
                    {r.user}
                  </Link>,
                  inr(r.amountMinor),
                  `${r.days} day${r.days === 1 ? '' : 's'}`,
                  <v2.Pill key="s" tone={st.tone}>
                    {st.label}
                  </v2.Pill>,
                  <span key="d" className="wp9-small wp9-nowrap">
                    {runs(r)}
                  </span>,
                  canStop ? (
                    <Confirm
                      key="x"
                      action={stop}
                      hidden={{ promotionId: r.id }}
                      label="Stop"
                      tier={3}
                      area="money"
                      tone="danger"
                      small
                      title={`Stop the promotion on “${r.title}”?`}
                      body={
                        <ul>
                          <li>The job stops showing higher straight away.</li>
                          <li>What it had not used goes back to {r.user}’s TaskDrop wallet; what it already delivered stays as TaskDrop’s earnings.</li>
                          <li>{r.user} is told, and sees the reason you write.</li>
                          <li>This cannot be undone.</li>
                        </ul>
                      }
                      reason={{ label: 'Reason (the advertiser sees it)', placeholder: 'e.g. misleading picture' }}
                      word="STOP"
                      confirmLabel="Stop promotion"
                    />
                  ) : (
                    <span key="x" />
                  ),
                ],
              };
            })}
          />
        </v2.Card>
      </div>
    </>
  );
}
