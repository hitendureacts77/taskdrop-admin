import Link from 'next/link';
import type { AdminAlertV2, AlertsReadV2 } from '@/lib/alerts';
import { ALERT_KIND, alertJobKey, alertKind, alertLink, groupAlerts, plainAlertBody, singularDigest } from '@/lib/alerts-text';
import { istDateTime, timeAgo } from '@/lib/format';
import { markAlertsReadV2 } from '@/lib/v2/safety-actions';
import { Icon } from '@/components/Icon';
import { Confirm } from '../Confirm';
import * as v2 from '../ui';

const CAP = 100;

function iconFor(kind: string): string {
  if (kind === 'digest') return 'list';
  if (kind === 'job_failed' || kind === 'outbox_stuck') return 'bolt';
  if (kind === 'self_dealing') return 'people';
  if (kind === 'support') return 'help';
  if (kind === 'dispute') return 'scale';
  if (kind === 'withdrawal' || kind === 'payout_failed') return 'bank';
  if (kind === 'reconcile') return 'money';
  return 'bell';
}

function bodyText(a: AdminAlertV2): string | null {
  if (!a.body) return null;
  return plainAlertBody(a.kind === 'digest' ? singularDigest(a.body) : a.body);
}

/** Team alerts (v2): plain-word kinds, a link to what each one is about, Unread / All, mark read per row or for everyone. */
export function AlertsV2({ view, read, now: nowIso, canMark, seesMoney }: { view: 'unread' | 'all'; read: AlertsReadV2; now: string; canMark: boolean; seesMoney: boolean }) {
  const now = new Date(nowIso);
  const groups = groupAlerts(read.alerts);
  const digest = seesMoney ? read.alerts.find((a) => a.kind === 'digest') : undefined;
  const noisy = groups.filter((g) => g.rest.length >= 2);
  const shown = read.alerts.length;
  const title = view === 'unread' ? (read.unread > shown ? `Showing the latest ${shown} of ${read.unread.toLocaleString('en-IN')} unread` : `${shown} unread alert${shown === 1 ? '' : 's'}`) : shown >= CAP ? `Showing the latest ${shown} alerts` : `${shown} alert${shown === 1 ? '' : 's'}`;
  const sub =
    view === 'unread'
      ? `Newest first.${read.unread > shown ? ' Mark these as read to see the older ones.' : ''} Repeated alerts of one kind are grouped.`
      : `Newest first.${read.total && read.total > shown ? ` Only the latest ${CAP} of ${read.total.toLocaleString('en-IN')} are listed.` : ''}`;

  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'Help & safety', href: '/support' }, { label: 'Team alerts' }]}
        title={
          <>
            Team alerts <span className="wp5-was">was “Alerts”</span>
          </>
        }
        sub="Messages the background jobs left for the team: waiting withdrawals, failed payouts, help requests, disputes, failed background jobs and the daily digest."
        right={
          canMark && read.unread > 0 ? (
            <Confirm
              action={markAlertsReadV2}
              hidden={{ ids: 'all' }}
              label="Mark all as read"
              tier={2}
              area="any"
              title={`Mark all ${read.unread.toLocaleString('en-IN')} alerts as read?`}
              body={<p>They are marked read for the whole team, not only for you. They stay under “All”. Nothing else changes.</p>}
              confirmLabel="Mark all read"
            />
          ) : null
        }
      />
      <v2.Tabs
        label="Show"
        items={[
          { href: '/alerts', label: 'Unread', count: read.unread, hot: read.unread > 0, active: view === 'unread' },
          { href: '/alerts?view=all', label: 'All', active: view === 'all' },
        ]}
      />
      {read.setup ? <v2.SetupNotice what="Team alerts are not switched on in the database here." detail="admin_alerts" /> : null}
      {read.error ? <v2.ErrorState detail={read.error} retryHref={view === 'all' ? '/alerts?view=all' : '/alerts'} /> : null}
      {!read.setup && !read.error ? (
        <v2.Grid cols="main">
          <div>
            <v2.Card title={title} sub={sub}>
              {groups.length ? (
                <ul className="wp5-list">
                  {groups.map(({ head: a, rest }) => {
                    const k = alertKind(a.kind);
                    const link = alertLink(a.kind, a.data, seesMoney);
                    const key = alertJobKey(a.kind, a.data);
                    const text = bodyText(a);
                    const unreadIds = [a, ...rest].filter((x) => !x.readAt).map((x) => x.id);
                    return (
                      <li key={a.id} className={`wp5-item${a.readAt ? ' read' : ''}`}>
                        <span className={`wp5-ic ${k.tone}`} aria-hidden="true">
                          <Icon name={iconFor(a.kind)} size={16} />
                        </span>
                        <div className="wp5-body">
                          <div className="v2-row wp5-gap">
                            <v2.Pill tone={k.tone}>{k.label}</v2.Pill>
                            {rest.length ? <span className="v2-tag-role">{rest.length + 1} ×</span> : null}
                            {a.readAt ? <v2.Pill tone="mut">Read</v2.Pill> : null}
                          </div>
                          <div className="wp5-t">{a.title}</div>
                          {text ? <div className="wp5-text">{text}</div> : null}
                          {link ? (
                            <Link className="wp5-go" href={link.href}>
                              {link.label} →
                            </Link>
                          ) : null}
                          {rest.length ? (
                            <details className="wp5-more">
                              <summary>Show all {rest.length + 1} (same kind, grouped)</summary>
                              <ul>
                                {rest.map((r) => {
                                  const l = alertLink(r.kind, r.data, seesMoney);
                                  return (
                                    <li key={r.id}>
                                      <span title={istDateTime(r.createdAt)}>{timeAgo(r.createdAt, now)}</span>
                                      {' · '}
                                      {l ? <Link href={l.href}>{l.label}</Link> : r.title}
                                      {r.readAt ? ' · read' : ''}
                                    </li>
                                  );
                                })}
                              </ul>
                            </details>
                          ) : null}
                          <div className="wp5-meta">
                            <span title={istDateTime(a.createdAt)}>{timeAgo(a.createdAt, now)}</span>
                            {key ? (
                              <>
                                {' · '}
                                <span className="v2-mono">{key}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        {canMark && unreadIds.length ? (
                          <div className="wp5-acts">
                            <Confirm
                              action={markAlertsReadV2}
                              hidden={{ ids: unreadIds.join(',') }}
                              label={unreadIds.length > 1 ? `Mark ${unreadIds.length} read` : 'Mark read'}
                              tier={1}
                              area="any"
                              small
                            />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <v2.Empty title={view === 'unread' ? 'All read' : 'No alerts yet'} icon="check">
                  <p className="v2-muted">New alerts show up here.</p>
                </v2.Empty>
              )}
            </v2.Card>
            {!canMark ? (
              <v2.Note tone="blue" title="View only">
                Your role can read team alerts but not mark them read: the read mark is shared by the whole team.
              </v2.Note>
            ) : null}
          </div>
          <div className="wp5-side">
            {digest?.body ? (
              <v2.Card title="Daily digest" sub={istDateTime(digest.createdAt)}>
                <p className="wp5-pre">{singularDigest(digest.body)}</p>
                <p className="v2-muted wp5-small">Sent every morning to staff with alerts switched on.</p>
              </v2.Card>
            ) : null}
            <v2.Card title="Kinds of alert">
              <ul className="wp5-kinds">
                {Object.entries(ALERT_KIND)
                  .filter(([, v]) => seesMoney || !v.money)
                  .map(([kind, v]) => (
                    <li key={kind}>
                      <v2.Pill tone={v.tone}>{v.label}</v2.Pill>
                    </li>
                  ))}
              </ul>
              <p className="v2-muted wp5-small">Shown in plain words. Each alert links to the job, help request or withdrawal it is about.</p>
            </v2.Card>
            {noisy.length ? (
              <v2.Note tone="orange" title="Worth a look">
                {noisy.map((g, i) => (
                  <span key={g.head.id}>
                    {i ? ' ' : ''}
                    {g.rest.length + 1} alerts say “{alertKind(g.head.kind).label.toLowerCase()}”.
                  </span>
                ))}{' '}
                They are grouped so they don’t bury the rest.
              </v2.Note>
            ) : null}
          </div>
        </v2.Grid>
      ) : null}
    </>
  );
}
