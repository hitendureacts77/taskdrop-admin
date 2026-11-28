import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import type { MoneyCheckNote, V2Read } from '@/lib/data/money';
import { istDate, istDateTime, inr } from '@/lib/format';
import { RECONCILE_CHECKS, checkTitle } from '@/lib/growth-calc';
import type { ReconcileRow } from '@/lib/growth';
import { splitExplained } from '@/lib/money-calc';
import type { ReconRun } from '@/lib/ops-calc';
import { isStaffRefusal } from '@/lib/ops-calc';
import type { OpsRead } from '@/lib/ops';
import { markMoneyCheckExplained } from '@/lib/v2/money-actions';

type Props = {
  days: number;
  kind: string;
  rows: V2Read<ReconcileRow[]>;
  from: string;
  to: string;
  runs: OpsRead<ReconRun[]>;
  notes: V2Read<MoneyCheckNote[]>;
  refusal: string;
  /** Hide test data is on: lines about fake seed jobs and people are left out. */
  hidden: number;
};

const lineHref = (r: ReconcileRow) => r.href ?? (r.refType === 'task' ? `/tasks/${r.refId}` : r.refType === 'payout' ? `/payouts/${r.refId}` : null);
const important = (r: { severity: string }) => r.severity === 'high';

/** Nights (IST days) in the last `span` days with no check of our books. */
function missingNights(runs: ReconRun[], span: number): string[] {
  const have = new Set(runs.filter((r) => r.kind === 'internal').map((r) => new Date(r.ranAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })));
  const out: string[] = [];
  const today = new Date();
  for (let i = 1; i <= span; i++) {
    const d = new Date(today.getTime() - i * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (!have.has(d)) out.push(d);
  }
  return out;
}

export function ReconcileV2({ days, kind, rows, from, to, runs, notes, refusal, hidden }: Props) {
  const header = (
    <v2.PageHeader
      title="Money check"
      crumbs={[{ label: 'Money', href: '/money' }, { label: 'Money check' }]}
      sub={`Things in ${istDate(from)} to ${istDate(to)} that don’t add up inside TaskDrop’s own records, plus anything still open from before. Our books are checked every night; payments from the last 3 days are also compared with Razorpay.`}
    />
  );
  const range = (
    <v2.Chips label="Range" items={[7, 30, 90].map((d) => ({ href: `/money/reconcile?days=${d}${kind !== 'all' ? `&kind=${kind}` : ''}`, label: `Last ${d} days`, active: d === days }))} />
  );
  if (rows.setup) return (<>{header}{range}<v2.SetupNotice what="The money check" detail="admin_reconcile" /></>);
  if (rows.error) {
    return (
      <>
        {header}
        {range}
        {isStaffRefusal(rows.error) ? <v2.Note tone="gold" title="Not available to your staff role">{refusal}</v2.Note> : <v2.ErrorState detail={rows.error} retryHref={`/money/reconcile?days=${days}`} />}
      </>
    );
  }

  const { open, explained } = splitExplained(rows.data, notes.data);
  const counts = new Map<string, number>();
  for (const r of open) counts.set(r.code, (counts.get(r.code) ?? 0) + 1);
  const shown = kind === 'all' ? open : open.filter((r) => r.code === kind);
  const importantCount = open.filter(important).length;
  const runList = runs.data;
  const lastInternal = runList.find((r) => r.kind === 'internal');
  const lastRazorpay = runList.find((r) => r.kind === 'razorpay');
  const gaps = runs.error || runs.refused || runs.setup ? [] : missingNights(runList, Math.min(days, 30));

  return (
    <>
      {header}
      {range}
      {lastRazorpay && lastRazorpay.checked === 0 ? (
        <v2.Note tone="red" title="Razorpay check looks at nothing">
          The last Razorpay check read <b>0 payments</b>, so “All fine” there means nothing. Ask the developer to look at the Razorpay key the nightly check uses.
        </v2.Note>
      ) : null}
      {gaps.length ? (
        <v2.Note tone="orange" title="Missing nights">
          No check of our books ran on {gaps.length} night{gaps.length === 1 ? '' : 's'} in this range ({gaps.slice(-1).map((d) => istDate(`${d}T12:00:00+05:30`))[0]} – {istDate(`${gaps[0]}T12:00:00+05:30`)}).
        </v2.Note>
      ) : null}
      {hidden ? <p className="v2-muted small">{hidden} line{hidden === 1 ? '' : 's'} about test data hidden.</p> : null}
      <v2.Grid cols={4}>
        <v2.Tile label="Open problems" value={open.length} foot={`across ${counts.size} kind${counts.size === 1 ? '' : 's'}`} tone="orange" />
        <v2.Tile label="Important" value={importantCount} foot="money may be wrong" tone="red" />
        <v2.Tile label="Last check" value={lastInternal ? istDateTime(lastInternal.ranAt).split(', ').slice(-1)[0] : '—'} foot={lastInternal ? `${istDate(lastInternal.ranAt)} · our books` : 'no run yet'} />
        <v2.Tile
          label={
            <>
              Explained <v2.NewTag />
            </>
          }
          value={explained.length}
          foot="lines with a staff note"
          tone="jade"
        />
      </v2.Grid>

      <v2.Grid cols="main">
        <v2.Card title="What to look at">
          <v2.Chips
            label="Kind"
            items={[
              { href: `/money/reconcile?days=${days}`, label: 'All kinds', count: open.length, active: kind === 'all' },
              ...[...counts.entries()].map(([code, c]) => ({ href: `/money/reconcile?days=${days}&kind=${code}`, label: checkTitle(code), count: c, active: kind === code })),
            ]}
          />
          <v2.DataTable
            columns={[{ label: 'Problem' }, { label: 'When' }, { label: 'Amount', right: true }, { label: 'Detail' }, { label: '' }]}
            empty="Everything adds up"
            rows={shown.slice(0, 200).map((r, i) => {
              const h = lineHref(r);
              return {
                key: `${r.code}-${r.refType}-${r.refId}-${r.at ?? i}`,
                cells: [
                  <span key="p">
                    <v2.Pill tone={important(r) ? 'danger' : 'wait'}>{important(r) ? 'Important' : 'Check'}</v2.Pill> <b>{checkTitle(r.code)}</b>
                    <span className="v2-muted small block">{h ? <Link href={h}>{r.subject ?? 'Open'}</Link> : (r.subject ?? 'Not linked to a job or withdrawal')}</span>
                  </span>,
                  r.at ? istDate(r.at) : '—',
                  r.amountMinor === null ? '—' : inr(r.amountMinor),
                  <span key="d" className="small">{r.detail}</span>,
                  <Confirm
                    key="c"
                    action={markMoneyCheckExplained}
                    hidden={{ code: r.code, refType: r.refType, refId: r.refId, at: r.at ?? '' }}
                    label="Mark explained"
                    tier={2}
                    area="money"
                    small
                    tone="plain"
                    title="Mark this as explained?"
                    body={<p>Write what happened. It goes to the audit log and the line leaves this list. No money moves.</p>}
                    reason={{ label: 'What happened?', minLength: 3 }}
                    confirmLabel="Save"
                  />,
                ],
              };
            })}
          />
          {shown.length > 200 ? <p className="v2-muted small">Showing the newest 200 of {shown.length}.</p> : null}
        </v2.Card>
        <v2.Card title="Summary of the 6 checks">
          <ul className="v2-checks">
            {Object.entries(RECONCILE_CHECKS).map(([code, c]) => (
              <li key={code}>
                <Link href={`/money/reconcile?days=${days}&kind=${code}`}>
                  <span>
                    <b>{c.title}</b>
                    <span className="v2-muted small block">{c.why}</span>
                  </span>
                  {counts.get(code) ? <v2.Pill tone={code.includes('waiting') || code.includes('stuck') ? 'wait' : 'danger'}>{counts.get(code)} to look at</v2.Pill> : <v2.Pill tone="ok">OK</v2.Pill>}
                </Link>
              </li>
            ))}
          </ul>
        </v2.Card>
      </v2.Grid>

      {notes.setup ? (
        <v2.SetupNotice what="Notes on Money check lines" detail="admin_money_check_explained" />
      ) : explained.length ? (
        <v2.Card title="Explained" sub="Lines a staff member wrote a note on. They stay out of the list above." right={<v2.NewTag />}>
          <v2.DataTable
            columns={[{ label: 'Problem' }, { label: 'When' }, { label: 'Amount', right: true }, { label: 'What happened' }, { label: 'By' }]}
            rows={explained.slice(0, 100).map(({ line, note }, i) => ({
              key: `${line.code}-${line.refId}-${i}`,
              cells: [checkTitle(line.code), line.at ? istDate(line.at) : '—', line.amountMinor === null ? '—' : inr(line.amountMinor), note.note, `${note.by} · ${istDate(note.when)}`],
            }))}
          />
        </v2.Card>
      ) : null}

      <v2.Card title="Nightly checks" sub="Newest first. Open a run to see each difference.">
        {runs.setup ? (
          <v2.SetupNotice what="Nightly check history" detail="admin_reconciliation_runs" />
        ) : runs.refused ? (
          <v2.Note tone="gold">{refusal}</v2.Note>
        ) : runs.error ? (
          <v2.ErrorState detail={runs.error} />
        ) : runList.length ? (
          runList.map((r) => (
            <details key={r.id} className="v2-run">
              <summary>
                <span>
                  {istDateTime(r.ranAt)} · <b>{r.kind === 'internal' ? 'Our books' : 'Razorpay'}</b>{' '}
                  <span className="v2-muted small">
                    {r.fromDay && r.toDay ? `${istDate(`${r.fromDay}T12:00:00+05:30`)} – ${istDate(`${r.toDay}T12:00:00+05:30`)} · ` : ''}
                    {r.checked} checked
                  </span>
                </span>
                {r.mismatches ? <v2.Pill tone="bad">{r.mismatches} differences</v2.Pill> : r.checked ? <v2.Pill tone="ok">All fine</v2.Pill> : <v2.Pill tone="wait">Checked nothing</v2.Pill>}
              </summary>
              {r.differences.length ? (
                <v2.DataTable
                  columns={[{ label: 'Kind' }, { label: 'Linked' }, { label: 'When' }, { label: 'Amount', right: true }, { label: 'Detail' }]}
                  rows={r.differences.slice(0, 50).map((x, i) =>
                    x.kind === 'internal'
                      ? {
                          key: `${r.id}-${i}`,
                          cells: [
                            <v2.Pill key="k" tone={x.severity === 'high' ? 'danger' : 'wait'}>{x.severity === 'high' ? 'Important' : 'Check'}</v2.Pill>,
                            x.refType === 'task' ? <Link href={`/tasks/${x.refId}`}>Job</Link> : x.refType === 'payout' ? <Link href={`/payouts/${x.refId}`}>Withdrawal</Link> : '—',
                            x.at ? istDate(x.at) : '—',
                            x.amountMinor === null ? '—' : inr(x.amountMinor),
                            x.detail || checkTitle(x.code),
                          ],
                        }
                      : { key: `${r.id}-${i}`, cells: [<v2.Pill key="k" tone="wait">Razorpay</v2.Pill>, x.payment || '—', '—', '—', `${x.note} (ours ${x.ours}, Razorpay ${x.theirs})`] },
                  )}
                />
              ) : (
                <p className="v2-muted small">{r.checked ? 'Every line matched.' : 'Nothing was read in this run.'}</p>
              )}
            </details>
          ))
        ) : (
          <v2.Empty title="No nightly check has run yet" />
        )}
      </v2.Card>
    </>
  );
}
