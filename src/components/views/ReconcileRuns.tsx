import Link from 'next/link';
import { inr, istDate, istDateTime } from '@/lib/format';
import { checkTitle } from '@/lib/growth-calc';
import type { OpsRead } from '@/lib/ops';
import { KIND_LABEL, razorpayLine, type ReconRun, type RunDifference } from '@/lib/ops-calc';
import { Card, Empty, Pill } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

const href = (type: string, id: string) => (type === 'task' ? `/tasks/${id}` : type === 'payout' ? `/payouts/${id}` : null);

function Difference({ d }: { d: RunDifference }) {
  if (d.kind === 'razorpay') {
    return (
      <li>
        <span>
          <strong>Payment {d.ref || d.payment.slice(0, 8)}</strong>
          <span className="muted small block">{razorpayLine(d)}</span>
        </span>
      </li>
    );
  }
  const h = href(d.refType, d.refId);
  return (
    <li>
      <span>
        <Pill tone={d.severity === 'high' ? 'red' : 'gold'}>{d.severity === 'high' ? 'Important' : 'Check'}</Pill> {h ? <Link href={h}>{checkTitle(d.code)}</Link> : checkTitle(d.code)}
        <span className="muted small block">
          {d.at ? `${istDate(d.at)} · ` : ''}
          {d.amountMinor === null ? '' : `${inr(d.amountMinor)} · `}
          {d.detail}
        </span>
      </span>
    </li>
  );
}

function Run({ run }: { run: ReconRun }) {
  const clean = run.mismatches === 0;
  const head = (
    <>
      <span className="run-when">
        <strong>{istDateTime(run.ranAt)}</strong>
        <span className="muted small block">
          {KIND_LABEL[run.kind]}
          {run.fromDay && run.toDay ? ` · ${run.fromDay} to ${run.toDay}` : ''}
        </span>
      </span>
      <span className="muted small">{run.checked.toLocaleString('en-IN')} checked</span>
      {clean ? <Pill tone="green">All fine</Pill> : <Pill tone="gold">{run.mismatches} {run.mismatches === 1 ? 'difference' : 'differences'}</Pill>}
    </>
  );
  if (clean) return <li className="run-row">{head}</li>;
  return (
    <li>
      <details className="run-details">
        <summary className="run-row">{head}</summary>
        {run.differences.length ? (
          <ul className="plain-list run-diffs">
            {run.differences.map((d, i) => (
              <Difference key={i} d={d} />
            ))}
          </ul>
        ) : (
          <p className="muted small run-diffs">The list of differences was not saved with this run.</p>
        )}
      </details>
    </li>
  );
}

/** The nightly checks history. `refusal` is the standard sentence for staff roles that may not see it. */
export function NightlyChecks({ runs, refusal }: { runs: OpsRead<ReconRun[]>; refusal: string }) {
  return (
    <Card title="Nightly checks" sub="Our books are checked every night; payments from the last 3 days are also compared with Razorpay’s payment links. Newest first.">
      {runs.setup ? (
        <SetupNotice what="The nightly check history" migration="097_closeout" />
      ) : runs.refused ? (
        <Empty title="Not available to your staff role" icon="shield">
          {refusal}
        </Empty>
      ) : runs.error ? (
        <ReadError message={runs.error} />
      ) : runs.data.length === 0 ? (
        <Empty title="No nightly check has run yet" icon="clock">
          The check runs at 2:30 am Indian time once the nightly job is set up. If this stays empty tomorrow, the job is not running.
        </Empty>
      ) : (
        <ul className="plain-list run-list">
          {runs.data.map((r) => (
            <Run key={r.id} run={r} />
          ))}
        </ul>
      )}
    </Card>
  );
}
