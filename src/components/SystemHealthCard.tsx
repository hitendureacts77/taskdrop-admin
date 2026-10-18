import Link from 'next/link';
import { istDateTime, timeAgo } from '@/lib/format';
import { getSystemHealth, type RunSummary } from '@/lib/ops';
import { KIND_LABEL, isRunStale, type RunKind } from '@/lib/ops-calc';
import { Icon } from './Icon';
import { Card, Pill } from './ui';

/** Shown while the card loads, so the dashboard never waits for it. */
export function SystemHealthSkeleton() {
  return (
    <Card title="System health" sub="Checking…">
      <p className="muted small">Reading the latest nightly check and pinging the app service.</p>
    </Card>
  );
}

function RunLine({ kind, run, now }: { kind: RunKind; run: RunSummary | null; now: Date }) {
  const label = `Nightly check: ${KIND_LABEL[kind]}`;
  if (!run) {
    return (
      <li>
        <span>{label}</span>
        <Pill tone="gold" title="No run recorded. The nightly job is probably not set up.">
          Never ran
        </Pill>
      </li>
    );
  }
  const stale = isRunStale(run.ranAt, now);
  return (
    <li>
      <span>
        {label}
        <span className="muted small block" title={istDateTime(run.ranAt)}>
          {timeAgo(run.ranAt, now)} · {run.checked.toLocaleString('en-IN')} checked
        </span>
      </span>
      {stale ? (
        <Pill tone="gold" title="Older than 36 hours: the nightly job may have stopped.">
          Too old
        </Pill>
      ) : run.mismatches > 0 ? (
        <Pill tone="gold">
          {run.mismatches} {run.mismatches === 1 ? 'difference' : 'differences'}
        </Pill>
      ) : (
        <Pill tone="green">All fine</Pill>
      )}
    </li>
  );
}

/** The dashboard's health card. Never throws: a failure shows as a muted line. */
export async function SystemHealthCard() {
  let h: Awaited<ReturnType<typeof getSystemHealth>> | null = null;
  try {
    h = await getSystemHealth();
  } catch {
    h = null;
  }
  if (!h) {
    return (
      <Card title="System health" right={<Link href="/settings/health">Details →</Link>}>
        <p className="muted small">Couldn’t read the system health just now.</p>
      </Card>
    );
  }
  const now = new Date(h.now);
  const attention = h.stale || !h.ping.ok;
  return (
    <div className="health-card">
      <Card title="System health" sub={attention ? 'Something needs a look.' : 'Everything reports in.'} right={<Link href="/settings/health">Details →</Link>}>
        <ul className="plain-list">
          {h.runsNote ? (
            <li>
              <span>Nightly money check</span>
              <span className="muted small">{h.runsNote === 'setup' ? 'Needs the database update 097_closeout' : h.runsNote === 'refused' ? 'Not visible to your staff role' : 'Couldn’t be read'}</span>
            </li>
          ) : (
            <>
              <RunLine kind="internal" run={h.runs.internal} now={now} />
              <RunLine kind="razorpay" run={h.runs.razorpay} now={now} />
            </>
          )}
          <li>
            <span>
              App service (app-config)
              {h.ping.ms !== null ? <span className="muted small block">{h.ping.ms} ms</span> : null}
            </span>
            {h.ping.ok ? <Pill tone="green">OK · {h.ping.ms} ms</Pill> : <Pill tone="red">{h.ping.detail}</Pill>}
          </li>
          <li>
            <span>Error tracking</span>
            {h.sentryUrl ? (
              <a href={h.sentryUrl} target="_blank" rel="noopener noreferrer">
                Open Sentry <Icon name="external" size={14} />
              </a>
            ) : (
              <span className="muted small">Add SENTRY_PROJECT_URL to link the Sentry project</span>
            )}
          </li>
        </ul>
        {h.stale && !h.runsNote ? <p className="muted small">The nightly check runs at 2:30 am Indian time. If it shows “Never ran” or “Too old”, the nightly job is not set up or has stopped.</p> : null}
      </Card>
    </div>
  );
}
