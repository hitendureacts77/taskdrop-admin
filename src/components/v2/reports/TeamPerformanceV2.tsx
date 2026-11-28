/**
 * Admin v2 Team performance (WP7, F358–F359). Same data as today's
 * PerformanceView; only shown on the v2 path of /team/performance.
 */
import * as v2 from '@/components/v2/ui';
import type { Read, StaffPerfRow } from '@/lib/growth';
import { activityTotal, formatMinutes } from '@/lib/growth-calc';
import { istDate, pct } from '@/lib/format';
import { asStaffRole, roleLabel } from '@/lib/staff-roles';
import { isTestRow } from '@/lib/test-data';

const COLS: v2.Column[] = [
  { label: 'Person' },
  { label: 'Follow-ups done', right: true },
  { label: 'On time', right: true },
  { label: 'Open / overdue', right: true },
  { label: 'Notes', right: true },
  { label: 'Help replies', right: true },
  { label: 'First reply' },
  { label: 'Reports handled', right: true },
  { label: 'Disputes decided', right: true },
  { label: 'Customers owned', right: true },
];

export function TeamPerformanceV2({ rows, days, from, to, hideTest }: { rows: Read<StaffPerfRow[]>; days: number; from: string; to: string; hideTest: boolean }) {
  const shown = rows.data.filter((p) => !hideTest || !isTestRow({ userId: p.userId })).sort((a, b) => activityTotal(b) - activityTotal(a));
  return (
    <div className="wp7">
      <v2.PageHeader
        title="Team performance"
        sub={`What each member of staff did from ${istDate(from)} to ${istDate(to)}. This shows workload and speed.`}
        crumbs={[{ label: 'Reports & settings', href: '/reports' }, { label: 'Team performance' }]}
      />
      <v2.Chips label="Range" items={[7, 30, 90].map((d) => ({ href: `/team/performance?days=${d}`, label: `Last ${d} days`, active: d === days }))} />
      <v2.Note tone="blue">This is not a score to judge people by. Some roles answer help requests, others never do.</v2.Note>
      <div className="wp7-mt">
        {rows.setup ? (
          <v2.SetupNotice what="Team performance" detail="admin_staff_performance" />
        ) : rows.error ? (
          <v2.ErrorState title="Could not load team performance" detail={rows.error} retryHref={`/team/performance?days=${days}`} />
        ) : (
          <v2.Card title="Per staff member" sub="Open / overdue and customers owned are as of today.">
            <v2.DataTable
              columns={COLS}
              empty="No staff to show"
              rows={shown.map((p) => ({
                key: p.userId,
                href: `/users/${p.userId}`,
                test: isTestRow({ userId: p.userId }),
                cells: [
                  <span key="n" className="wp7-who">
                    <b>{p.name}</b>
                    <span className="v2-tag-role">{roleLabel(asStaffRole(p.staffRole))}</span>
                  </span>,
                  p.tasksDone,
                  p.tasksDone ? pct(p.tasksOnTime / p.tasksDone) : '—',
                  p.tasksOverdue ? (
                    <span key="o">
                      {p.tasksOpen} / <v2.Pill tone="danger">{p.tasksOverdue}</v2.Pill>
                    </span>
                  ) : (
                    `${p.tasksOpen} / 0`
                  ),
                  p.notes,
                  p.ticketReplies,
                  formatMinutes(p.firstResponseMinutes),
                  p.reportsHandled,
                  p.disputesDecided,
                  p.customersOwned,
                ],
              }))}
            />
          </v2.Card>
        )}
      </div>
    </div>
  );
}
