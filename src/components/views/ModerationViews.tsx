import Link from 'next/link';
import { ConfirmAction } from '../ConfirmAction';
import { hideMessage, hideTask, resolveReport, unhideMessage, unhideTask } from '@/lib/growth-actions';
import type { ReportRow, Read } from '@/lib/growth';
import { timeAgo } from '@/lib/format';
import { Card, Empty, PageHeader, Pill, Tabs } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

const KIND: Record<string, string> = { user: 'Person', task: 'Job', message: 'Message', review: 'Review' };

function targetHref(r: ReportRow): string | null {
  if (r.targetType === 'user') return `/users/${r.targetId}`;
  if (r.targetType === 'task') return `/tasks/${r.targetId}`;
  return null;
}

export function ReportsQueueView({ view, reports, now }: { view: 'open' | 'done'; reports: Read<ReportRow[]>; now: string }) {
  const at = new Date(now);
  return (
    <>
      <PageHeader title="Reports" sub="Things people flagged as wrong. Look, decide, and close each one." />
      <Tabs
        label="Show"
        items={[
          { href: '/reports-queue', label: 'Open', active: view === 'open' },
          { href: '/reports-queue?view=done', label: 'Handled', active: view === 'done' },
        ]}
      />
      {reports.setup ? <SetupNotice what="Reports" migration="093_moderation" /> : null}
      {reports.error ? <ReadError message={reports.error} /> : null}
      {!reports.setup && !reports.error ? (
        reports.data.length ? (
          <div className="stack">
            {reports.data.map((r) => {
              const href = targetHref(r);
              return (
                <Card
                  key={r.id}
                  title={
                    <span>
                      <Pill tone="gold">{KIND[r.targetType] ?? r.targetType}</Pill> {href ? <Link href={href}>{r.targetLabel}</Link> : r.targetLabel}
                    </span>
                  }
                  sub={`Reported by ${r.reporter} · ${timeAgo(r.createdAt, at)}`}
                  right={r.hidden ? <Pill tone="red">Hidden</Pill> : r.status !== 'open' ? <Pill tone={r.status === 'actioned' ? 'green' : 'grey'}>{r.status === 'actioned' ? 'Acted on' : 'Dismissed'}</Pill> : null}
                >
                  <p className="prose">“{r.reason}”</p>
                  {r.message ? (
                    <div>
                      <p className="muted small">The reported message{r.message.hidden ? ' (hidden from the chat)' : ''}:</p>
                      <blockquote className="prose">{r.message.body}</blockquote>
                      {r.message.hidden ? (
                        <ConfirmAction
                          action={unhideMessage}
                          hidden={{ messageId: r.targetId }}
                          trigger="Show it in the chat again"
                          tone="quiet"
                          title="Show this message again?"
                          consequence="Both people in the chat can see it again."
                          confirmLabel="Show it again"
                        />
                      ) : (
                        <ConfirmAction
                          action={hideMessage}
                          hidden={{ messageId: r.targetId }}
                          trigger="Hide this message"
                          tone="danger"
                          title="Hide this message?"
                          consequence="It disappears for both people in the chat. It is kept, so you can bring it back. Hiding does not close the report."
                          field={{ name: 'reason', label: 'Why', required: true }}
                          confirmLabel="Yes, hide it"
                        />
                      )}
                    </div>
                  ) : null}
                  {r.status === 'open' ? (
                    <div className="pill-row">
                      <ConfirmAction
                        action={resolveReport}
                        hidden={{ reportId: r.id, status: 'actioned' }}
                        trigger="Mark acted on"
                        title="Mark this report as acted on?"
                        consequence="Use this once you have done something about it (hid the job, suspended the person, messaged them). It closes the report; nothing else changes."
                        field={{ name: 'note', label: 'What you did (optional)' }}
                        confirmLabel="Mark acted on"
                      />
                      <ConfirmAction
                        action={resolveReport}
                        hidden={{ reportId: r.id, status: 'dismissed' }}
                        trigger="Dismiss"
                        tone="quiet"
                        title="Dismiss this report?"
                        consequence="There is nothing to act on. It closes the report; the person who reported it is not told."
                        field={{ name: 'note', label: 'Why (optional)' }}
                        confirmLabel="Dismiss"
                      />
                    </div>
                  ) : (
                    <p className="muted small">
                      {r.handledBy ? `Handled by ${r.handledBy}. ` : ''}
                      {r.resolution ?? ''}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Empty title={view === 'open' ? 'No open reports' : 'Nothing handled yet'} />
        )
      ) : null}
    </>
  );
}

/** Hide or restore a job, on the job's page. */
export function HideTaskCard({ taskId, state }: { taskId: string; state: { hidden: boolean; reason: string | null; setup: boolean } }) {
  if (state.setup) return null;
  return (
    <Card title="Visibility" sub={state.hidden ? 'Hidden from everyone except its poster and admins.' : 'Everyone who could see this job can see it.'}>
      {state.hidden ? (
        <>
          <p className="prose small">Why it is hidden: {state.reason}</p>
          <ConfirmAction
            action={unhideTask}
            hidden={{ taskId }}
            trigger="Make visible again"
            tone="quiet"
            title="Show this job again?"
            consequence="Anyone who could see it before can see it again. Money and status are not touched."
            confirmLabel="Make visible"
          />
        </>
      ) : (
        <ConfirmAction
          action={hideTask}
          hidden={{ taskId }}
          trigger="Hide this job"
          tone="danger"
          title="Hide this job?"
          consequence="It disappears from search and lists for everyone except its poster and admins. Money, offers and status are not touched, and you can show it again any time."
          field={{ name: 'reason', label: 'Why', required: true }}
          confirmLabel="Hide it"
        />
      )}
    </Card>
  );
}
