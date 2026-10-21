import { markAlertsRead } from '@/lib/alerts-actions';
import type { AlertsRead } from '@/lib/alerts';
import { istDateTime, timeAgo } from '@/lib/format';
import { ConfirmAction } from '../ConfirmAction';
import { Card, Empty, PageHeader, Pill, Tabs } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

const KIND: Record<string, string> = {
  withdrawal: 'Withdrawal',
  payout_failed: 'Payout failed',
  support: 'Help request',
  dispute: 'Dispute',
  digest: 'Daily digest',
};

export function AlertsView({ view, read, now: nowIso }: { view: 'unread' | 'all'; read: AlertsRead; now: string }) {
  const now = new Date(nowIso);
  return (
    <>
      <PageHeader title="Alerts" sub="Messages the background jobs left for the team: waiting withdrawals, failed payouts, help requests, disputes and the daily digest." />
      <Tabs
        label="Show"
        items={[
          { href: '/alerts', label: `Unread${read.unread ? ` (${read.unread})` : ''}`, active: view === 'unread' },
          { href: '/alerts?view=all', label: 'All', active: view === 'all' },
        ]}
      />
      {read.setup ? <SetupNotice what="Alerts" migration="090_outbox_inngest" /> : null}
      {read.error ? <ReadError message={read.error} /> : null}
      {!read.setup && !read.error ? (
        read.alerts.length ? (
          <Card title={`${read.alerts.length} alert${read.alerts.length === 1 ? '' : 's'}`} sub="Newest first, the latest 100." flush>
            {read.unread > 0 ? (
              <div style={{ padding: '12px 16px' }}>
                <ConfirmAction
                  action={markAlertsRead}
                  hidden={{ alertId: 'all' }}
                  trigger="Mark all as read"
                  tone="quiet"
                  title="Mark every alert as read?"
                  consequence={<>This only hides them from the Unread list. Nothing else changes.</>}
                  confirmLabel="Yes, mark all read"
                />
              </div>
            ) : null}
            <ul className="plain-list">
              {read.alerts.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.title}</strong> <Pill tone={a.kind === 'payout_failed' ? 'red' : a.readAt ? 'grey' : 'blue'}>{KIND[a.kind] ?? a.kind}</Pill>
                    {a.body ? <span className="muted small block">{a.body}</span> : null}
                    <span className="muted small block" title={istDateTime(a.createdAt)}>
                      {timeAgo(a.createdAt, now)}
                      {a.readAt ? ' · read' : ''}
                    </span>
                  </span>
                  {!a.readAt ? (
                    <ConfirmAction
                      action={markAlertsRead}
                      hidden={{ alertId: a.id }}
                      trigger="Mark read"
                      tone="quiet"
                      title="Mark this alert as read?"
                      consequence={<>It leaves the Unread list. Nothing else changes.</>}
                      confirmLabel="Mark read"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Empty title={view === 'unread' ? 'No unread alerts' : 'No alerts yet'} />
        )
      ) : null}
    </>
  );
}
