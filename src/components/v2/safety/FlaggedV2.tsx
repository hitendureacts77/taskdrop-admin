import Link from 'next/link';
import type { Read, ReportRow } from '@/lib/growth';
import { hideMessage, hideReview, unhideMessage, unhideReview, warnUser } from '@/lib/growth-actions';
import { istDateTime, timeAgo } from '@/lib/format';
import { isTestRow } from '@/lib/test-data';
import { resolveReportV2 } from '@/lib/v2/safety-actions';
import { Icon } from '@/components/Icon';
import { Confirm } from '../Confirm';
import * as v2 from '../ui';

const KIND: Record<string, { label: string; icon: string; tone: string }> = {
  user: { label: 'Person', icon: 'people', tone: 'bad' },
  task: { label: 'Job', icon: 'jobs', tone: 'wait' },
  message: { label: 'Message', icon: 'send', tone: 'earn' },
  review: { label: 'Review', icon: 'star', tone: 'mut' },
};

/** A flagged item counts as test data when the reporter or the reported person is a fake seed account, or the job title starts [e2e]. */
export function isTestReport(r: ReportRow): boolean {
  return isTestRow({ userId: r.reporterId, posterId: r.targetType === 'user' ? r.targetId : null, title: r.targetType === 'task' ? r.targetLabel : null });
}

function statusPill(r: ReportRow) {
  if (r.hidden) return <v2.Pill tone="mut">Hidden</v2.Pill>;
  if (r.status === 'actioned') return <v2.Pill tone="ok">Acted on</v2.Pill>;
  if (r.status === 'dismissed') return <v2.Pill tone="mut">Dismissed</v2.Pill>;
  return null;
}

function target(r: ReportRow) {
  if (r.targetType === 'user') return <Link href={`/users/${r.targetId}`}>{r.targetLabel}</Link>;
  if (r.targetType === 'task') return <Link href={`/tasks/${r.targetId}`}>{r.targetLabel}</Link>;
  return <span>{r.targetLabel}</span>;
}

/**
 * Flagged content (v2, was "Reports"): Open / Handled, one card per report with what was reported and every
 * action today's page has. Hiding a message or removing a review can be undone, from either tab.
 */
export function FlaggedV2({ view, reports, now, canAct, openCount }: { view: 'open' | 'done'; reports: Read<ReportRow[]>; now: string; canAct: boolean; openCount: number | null }) {
  const at = new Date(now);
  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'Help & safety', href: '/support' }, { label: 'Flagged content' }]}
        title={
          <>
            Flagged content <span className="wp5-was">was “Reports”</span>
          </>
        }
        sub="Things people flagged as wrong: jobs, messages, reviews and people. Look, decide, and close each one."
      />
      <v2.Tabs
        label="Show"
        items={[
          { href: '/reports-queue', label: 'Open', count: openCount ?? undefined, hot: (openCount ?? 0) > 0, active: view === 'open' },
          { href: '/reports-queue?view=done', label: 'Handled', active: view === 'done' },
        ]}
      />
      {!canAct ? (
        <v2.Note tone="blue" title="View only">
          Your role can read reports, but only Admin, Support and Sales can act on them.
        </v2.Note>
      ) : null}
      {reports.setup ? <v2.SetupNotice what="Flagged content is not switched on in the database here." detail="reports" /> : null}
      {reports.error ? <v2.ErrorState detail={reports.error} retryHref={view === 'done' ? '/reports-queue?view=done' : '/reports-queue'} /> : null}
      {!reports.setup && !reports.error ? (
        <v2.Card
          title={view === 'open' ? `${reports.data.length} open` : 'Handled'}
          sub={view === 'open' ? 'Oldest first. Hiding a message or removing a review can be undone from Handled.' : 'Who handled each one, and their note. Newest first.'}
        >
          {reports.data.length ? (
            <ul className="wp5-list">
              {reports.data.map((r) => {
                const k = KIND[r.targetType] ?? { label: 'Other', icon: 'flag', tone: 'mut' };
                return (
                  <li key={r.id} className="wp5-item">
                    <span className={`wp5-ic ${k.tone}`} aria-hidden="true">
                      <Icon name={k.icon} size={16} />
                    </span>
                    <div className="wp5-body">
                      <div className="v2-row wp5-gap">
                        <v2.Pill tone="mut">{k.label}</v2.Pill>
                        <span className="wp5-t">{target(r)}</span>
                        <v2.TestTag show={isTestReport(r)} />
                        {statusPill(r)}
                      </div>
                      <div className="wp5-meta">
                        Reported by <Link href={`/users/${r.reporterId}`}>{r.reporter}</Link> · <span title={istDateTime(r.createdAt)}>{timeAgo(r.createdAt, at)}</span>
                      </div>
                      <p className="wp5-quote">“{r.reason}”</p>
                      {r.message ? (
                        <div className="wp5-msg">
                          {r.message.body}
                          {r.message.hidden ? <small>Hidden from the chat</small> : null}
                        </div>
                      ) : null}
                      {r.review ? (
                        <div className="wp5-msg review">
                          <span aria-label={`${r.review.rating} of 5 stars`}>
                            {'★'.repeat(Math.max(0, Math.min(5, r.review.rating)))}
                            {'☆'.repeat(5 - Math.max(0, Math.min(5, r.review.rating)))}
                          </span>{' '}
                          “{r.review.comment || 'No comment, stars only'}”
                          {r.review.hidden ? <small>Removed, not counted in their rating</small> : null}
                        </div>
                      ) : null}
                      {r.status !== 'open' ? (
                        <div className="wp5-meta">
                          Handled by <b>{r.handledBy ?? 'an admin'}</b>
                          {r.resolution ? <> · “{r.resolution}”</> : null}
                        </div>
                      ) : null}
                    </div>
                    {canAct ? <div className="wp5-acts">{actions(r)}</div> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <v2.Empty title={view === 'open' ? 'Nothing is flagged' : 'Nothing handled yet'} icon="check">
              <p className="v2-muted">When someone reports a job, a message, a review or a person, it shows here.</p>
            </v2.Empty>
          )}
        </v2.Card>
      ) : null}
    </>
  );
}

function actions(r: ReportRow) {
  const out = [];
  if (r.message) {
    out.push(
      r.message.hidden ? (
        <Confirm
          key="unhide-msg"
          action={unhideMessage}
          hidden={{ messageId: r.targetId }}
          label="Show it in the chat again"
          tier={2}
          area="people"
          small
          title="Show this message again?"
          body={<p>Both people in the chat can see it again.</p>}
          confirmLabel="Show again"
        />
      ) : (
        <Confirm
          key="hide-msg"
          action={hideMessage}
          hidden={{ messageId: r.targetId }}
          label="Hide this message"
          tier={2}
          area="people"
          small
          tone="warn"
          title="Hide this message from the chat?"
          body={<p>It disappears for both people in the chat. It is kept, so you can show it again later. Hiding does not close the report.</p>}
          reason={{ label: 'Why (kept in the audit log)' }}
          confirmLabel="Hide message"
        />
      ),
    );
  }
  if (r.review) {
    out.push(
      r.review.hidden ? (
        <Confirm
          key="unhide-rev"
          action={unhideReview}
          hidden={{ reviewId: r.targetId }}
          label="Put the review back"
          tier={2}
          area="people"
          small
          title="Put this review back?"
          body={<p>It shows on their profile again and counts toward their rating.</p>}
          confirmLabel="Put back"
        />
      ) : (
        <Confirm
          key="hide-rev"
          action={hideReview}
          hidden={{ reviewId: r.targetId }}
          label="Remove this review"
          tier={2}
          area="people"
          small
          tone="warn"
          title="Remove this review?"
          body={<p>It stops showing, and the person’s rating and review count are worked out again without it. It is kept, so you can put it back. Removing does not close the report.</p>}
          reason={{ label: 'Why (kept in the audit log)' }}
          confirmLabel="Remove review"
        />
      ),
    );
  }
  if (r.status === 'open') {
    if (r.targetType === 'user') {
      out.push(
        <Confirm
          key="warn"
          action={warnUser}
          hidden={{ userId: r.targetId, reportId: r.id }}
          label="Warn them"
          tier={2}
          area="people"
          small
          tone="warn"
          title={`Warn ${r.targetLabel}?`}
          body={<p>They get a notification with your message, the warning is kept on their record, and this report is closed as acted on.</p>}
          reason={{ label: 'Message they read' }}
          confirmLabel="Send warning"
        />,
      );
    }
    out.push(
      <Confirm
        key="acted"
        action={resolveReportV2}
        hidden={{ reportId: r.id, status: 'actioned' }}
        label="Mark acted on"
        tier={2}
        area="people"
        small
        title="Mark this report as acted on?"
        body={<p>Use this once you have done something about it (hid the job, suspended the person, messaged them). It moves to Handled with your name. Nothing else changes.</p>}
        reason={{ label: 'What you did (optional)', optional: true }}
        confirmLabel="Mark acted on"
      />,
      <Confirm
        key="dismiss"
        action={resolveReportV2}
        hidden={{ reportId: r.id, status: 'dismissed' }}
        label="Dismiss"
        tier={2}
        area="people"
        small
        tone="plain"
        title="Dismiss this report?"
        body={<p>Nothing changes for anyone. The person who reported it is not told.</p>}
        reason={{ label: 'Why (optional)', optional: true }}
        confirmLabel="Dismiss"
      />,
    );
  }
  return out;
}
