import Link from 'next/link';
import { istDateTime } from '@/lib/format';
import { flowLabel, HOLD_STATES, holdStateLabel, providerLabel } from '@/lib/plan-b-calc';
import type { PlanBRead } from '@/lib/plan-b';
import { ConfirmAction, type FormAction } from '../ConfirmAction';
import { Card, Empty, Money, Notice, PageHeader, Pill } from '../ui';
import { ReadError } from './SetupNotice';

/** Plan B money controls: the Money stop, the holds and the nightly match. */
export function PlanBView({ read, refusal, canPause, setPaused, retryMove }: { read: PlanBRead; refusal: string; canPause: boolean; setPaused: FormAction; retryMove: FormAction }) {
  const crumbs = [{ href: '/money', label: 'Money' }, { label: 'Plan B' }];
  const sub = 'Each task’s money is held by Razorpay Route until the poster approves it.';
  if (read.setup) {
    return (
      <>
        <PageHeader crumbs={crumbs} title="Plan B money" sub={sub} />
        <Notice tone="gold" title="Plan B is not set up on this database yet">
          Nothing is broken. Once the database update behind Plan B (migration 193) is applied here, this page fills in by itself.
        </Notice>
      </>
    );
  }
  if (read.refused) {
    return (
      <>
        <PageHeader crumbs={crumbs} title="Plan B money" sub={sub} />
        <Notice tone="gold" title="Not available to your staff role">
          {refusal}
        </Notice>
      </>
    );
  }
  if (read.error || !read.data) {
    return (
      <>
        <PageHeader crumbs={crumbs} title="Plan B money" sub={sub} />
        <ReadError message={read.error ?? 'No answer came back.'} />
      </>
    );
  }
  const o = read.data;
  const extra = Object.keys(o.counts).filter((c) => !HOLD_STATES.some((s) => s.code === c));
  return (
    <>
      <PageHeader crumbs={crumbs} title="Plan B money" sub={sub} />

      <Card title="Money stop">
        <div className="stack">
          <p>
            {o.paused ? <Pill tone="red">Paused</Pill> : <Pill tone="green">Running</Pill>}{' '}
            {o.paused && o.pausedSince ? <span className="muted small">since {istDateTime(o.pausedSince)}</span> : null}
          </p>
          <p className="muted small">
            Flow: <strong>{flowLabel(o.flow)}</strong>. Provider: <strong>{providerLabel(o.provider)}</strong>.
          </p>
          {canPause ? (
            <ConfirmAction
              action={setPaused}
              hidden={{ pause: o.paused ? '0' : '1' }}
              trigger={o.paused ? 'Resume' : 'Pause payments and releases'}
              tone={o.paused ? 'primary' : 'danger'}
              title={o.paused ? 'Resume payments and releases?' : 'Pause payments and releases?'}
              consequence={o.paused ? 'New payments and releases start again within a minute.' : 'New payments and releases stop within a minute. Refunds keep working. You can resume at any time.'}
              field={{ name: 'reason', label: 'Reason', placeholder: 'Why are you doing this?', required: true, help: 'Saved in the audit log.' }}
              confirmLabel={o.paused ? 'Resume' : 'Pause'}
            />
          ) : (
            <p className="muted small">Only a full admin can pause or resume.</p>
          )}
          <p className="muted small">Paused stops new payments and releases within a minute. Refunds keep working.</p>
        </div>
      </Card>

      <Card title="Plan B holds" sub={<>Total held right now: <Money minor={o.heldMinor} /></>}>
        <ul className="plain-list">
          {[...HOLD_STATES.map((s) => s.code), ...extra].map((code) => (
            <li key={code}>
              <span>{holdStateLabel(code)}</span>
              <Pill tone={code === 'failed' && (o.counts[code] ?? 0) > 0 ? 'red' : 'blue'}>{o.counts[code] ?? 0}</Pill>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Stuck" sub="Failed moves. Retry sends the release or refund again." flush>
        {o.stuck.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Task</th>
                  <th className="th">Was</th>
                  <th className="th">Note</th>
                  <th className="th num">Tries</th>
                  <th className="th">Last update</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {o.stuck.map((s) => (
                  <tr key={s.holdId}>
                    <td className="td">{s.taskId ? <Link href={`/tasks/${s.taskId}`}>Open task</Link> : '—'}</td>
                    <td className="td">{s.from ? holdStateLabel(s.from) : '—'}</td>
                    <td className="td">{s.note || '—'}</td>
                    <td className="td num">{s.attempts}</td>
                    <td className="td nowrap">{s.updatedAt ? istDateTime(s.updatedAt) : '—'}</td>
                    <td className="td">
                      <ConfirmAction
                        action={retryMove}
                        hidden={{ holdId: s.holdId }}
                        trigger="Retry"
                        tone="quiet"
                        title="Send this again?"
                        consequence="The failed release or refund is sent to Razorpay again. It is saved in the audit log."
                        field={{ name: 'reason', label: 'Reason', placeholder: 'Why try again?', required: true }}
                        confirmLabel="Retry"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing is stuck" icon="check" />
        )}
      </Card>

      <Card title="Nightly match" sub="Our records against the provider’s, last 14 days." flush>
        {o.matches.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Day</th>
                  <th className="th">Provider</th>
                  <th className="th num">Ours</th>
                  <th className="th num">Theirs</th>
                  <th className="th num">Difference</th>
                  <th className="th">Detail</th>
                </tr>
              </thead>
              <tbody>
                {o.matches.map((m) => (
                  <tr key={`${m.day}-${m.provider}`}>
                    <td className="td nowrap">{m.day}</td>
                    <td className="td">{m.provider === 'razorpay_route' ? 'Razorpay Route' : m.provider === 'simulated' ? 'Simulated' : m.provider}</td>
                    <td className="td num">
                      <Money minor={m.oursMinor} />
                    </td>
                    <td className="td num">
                      <Money minor={m.theirsMinor} />
                    </td>
                    <td className="td num">
                      {m.ok ? (
                        <Pill tone="green">Matches</Pill>
                      ) : (
                        <Pill tone="red">
                          Off by <Money minor={Math.abs(m.diffMinor)} />
                        </Pill>
                      )}
                    </td>
                    <td className="td">{m.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No match has run yet" />
        )}
      </Card>
    </>
  );
}
