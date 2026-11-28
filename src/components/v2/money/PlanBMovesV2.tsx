import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import type { PlanBMove, PlanBOverview, V2Read } from '@/lib/data/money';
import { inr, istDate, istDateTime } from '@/lib/format';
import { moveAmountMinor, moveStatus } from '@/lib/money-calc';
import { isStaffRefusal } from '@/lib/ops-calc';
import { isTestRow } from '@/lib/test-data';
import { retryPlanBMove } from '@/lib/v2/money-actions';

const MOVE_WORDS = { release: 'Release to worker', refund: 'Refund to poster', split: 'Split: worker and poster', none: '—' } as const;

/**
 * "Pay per task: releases and refunds" on Earnings & escrow (design v2, New). Plan B holds that are moving,
 * failed (with Retry now), just landed, and jobs that expired unpaid. Retry uses admin_plan_b_retry_move.
 */
export function PlanBMovesV2({ overview, moves, hide }: { overview: V2Read<PlanBOverview | null>; moves: V2Read<PlanBMove[]>; hide: boolean }) {
  const title = (
    <h2 className="v2-sec-t" id="moves">
      Pay per task: releases and refunds <v2.NewTag />
    </h2>
  );
  if (overview.setup || moves.setup) {
    return (
      <>
        {title}
        <v2.SetupNotice what="Pay per task money moves" detail={overview.setup ? 'admin_plan_b_overview' : 'admin_plan_b_moves'} />
      </>
    );
  }
  const err = overview.error ?? moves.error;
  if (err) {
    return (
      <>
        {title}
        {isStaffRefusal(err) ? <v2.Note tone="gold" title="Not available to your staff role">Ask a full admin or finance.</v2.Note> : <v2.ErrorState detail={err} retryHref="/money#moves" />}
      </>
    );
  }
  const o = overview.data;
  const all = moves.data.filter((m) => !hide || !isTestRow({ id: m.taskId, posterId: m.posterId, userId: m.workerId, title: m.title }));
  const live = all.filter((m) => m.status !== 'expired');
  const expired = all.filter((m) => m.status === 'expired');
  const failed = live.filter((m) => m.status === 'failed');
  const waitingMinor = live.filter((m) => m.status === 'release_asked').reduce((a, m) => a + moveAmountMinor(m), 0);
  const testCount = (m: PlanBMove) => isTestRow({ id: m.taskId, posterId: m.posterId, userId: m.workerId, title: m.title });

  return (
    <>
      {title}
      <v2.Note tone="blue">
        The server sends releases (to workers) and refunds (to posters) through Razorpay. If one fails it tries again, up to 5 times. You can retry it now: it uses
        the same key, so it can never be paid twice.
        {o && o.flow !== 'plan_b' ? <> Pay per task is not switched on yet (money flow: wallet), so this list may be empty.</> : null}
        {o?.paused ? <> <b>All money is paused</b>: nothing moves until it is switched back on.</> : null}
      </v2.Note>
      <v2.Grid cols={4}>
        <v2.Tile small label="Held at Razorpay for jobs" value={inr(o?.heldMinor ?? 0)} foot="same money as escrow above" tone="gold" />
        <v2.Tile small label="Waiting to release" value={inr(waitingMinor)} foot={`${live.filter((m) => m.status === 'release_asked').length} asked, going out on the next run`} />
        <v2.Tile small label="Failed moves" value={failed.length} foot={failed.length ? 'retrying by themselves' : 'none'} tone={failed.length ? 'orange' : undefined} />
        <v2.Tile small label="Unpaid jobs that expired" value={expired.length} foot="last 14 days · no money taken" />
      </v2.Grid>
      <v2.Card title="Money moves" sub="Failed first, then the newest. Landed moves stay here for 14 days.">
        <v2.DataTable
          columns={[{ label: 'Job' }, { label: 'Move' }, { label: 'To' }, { label: 'Amount', right: true }, { label: 'Status' }, { label: 'Why' }, { label: '' }]}
          empty="No money is moving"
          rows={live.map((m) => {
            const st = moveStatus(m);
            const to = st.move === 'refund' ? m.poster : st.move === 'split' ? `${m.worker} and ${m.poster}` : m.worker;
            const toHref = st.move === 'refund' ? m.posterId : st.move === 'release' ? m.workerId : null;
            const amount = moveAmountMinor(m);
            return {
              key: m.holdId,
              test: !hide && testCount(m),
              cells: [
                <Link key="j" href={`/tasks/${m.taskId}`}>{m.title}</Link>,
                MOVE_WORDS[st.move],
                toHref ? <Link key="t" href={`/users/${toHref}`}>{to}</Link> : to,
                <b key="a">{inr(amount)}</b>,
                <v2.Pill key="s" tone={st.tone}>{st.label}</v2.Pill>,
                <span key="w" className="v2-muted small">
                  {m.status === 'failed' ? (m.note ?? 'Razorpay did not accept it') : m.settledAt ? `Landed ${istDateTime(m.settledAt)}` : `Started ${istDateTime(m.updatedAt)}`}
                </span>,
                m.status === 'failed' && m.failedFrom ? (
                  <Confirm
                    key="r"
                    action={retryPlanBMove}
                    hidden={{ holdId: m.holdId }}
                    label="Retry now"
                    tier={3}
                    area="money"
                    small
                    title={`Retry: ${MOVE_WORDS[st.move].toLowerCase()} of ${inr(amount)}`}
                    body={
                      <>
                        <p>Sends it to Razorpay again on the next run. It uses the same key, so it can never be paid twice.</p>
                        <ul>
                          <li>{to} gets {inr(amount)} if Razorpay accepts.</li>
                          <li>If it fails again it stays in this list.</li>
                        </ul>
                      </>
                    }
                    reason={{ label: 'Why retry now? (optional)', optional: true }}
                    word="RETRY"
                    confirmLabel="Retry now"
                  />
                ) : (
                  ''
                ),
              ],
            };
          })}
        />
      </v2.Card>
      <v2.Card title="Unpaid jobs that expired" sub="The poster did not pay in time, so the job closed. No money was taken." right={<v2.NewTag />}>
        <v2.DataTable
          columns={[{ label: 'Job' }, { label: 'Poster' }, { label: 'Expired' }]}
          empty="None in the last 14 days"
          rows={expired.map((m) => ({
            key: m.holdId,
            test: !hide && testCount(m),
            cells: [
              <Link key="j" href={`/tasks/${m.taskId}`}>{m.title}</Link>,
              m.posterId ? <Link key="p" href={`/users/${m.posterId}`}>{m.poster}</Link> : m.poster,
              istDate(m.expiresAt ?? m.updatedAt),
            ],
          }))}
        />
      </v2.Card>
    </>
  );
}
