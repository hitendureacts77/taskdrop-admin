import Link from 'next/link';
import type { TodayCounts } from '@/lib/data';
import { LiveFeed } from '../LiveFeed';
import { LiveStrip } from '../LiveStrip';
import { NeedsYou } from '../NeedsYou';
import { Card, PageHeader, StatLink } from '../ui';

function greeting(now: Date) {
  const h = Number(now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/**
 * The Dashboard for the Sales role: customers, jobs and leads, with none of the
 * company's money (staff-roles.ts, staffCanSee). Everything here is a count or a
 * list of people and jobs; the live pieces are already filtered for the role.
 */
export function SalesDashboardView({ today, now: nowIso }: { today: TodayCounts; now: string }) {
  const now = new Date(nowIso);
  const links = [
    { href: '/crm', title: 'Customer hub', sub: 'Your people, notes, tags and messages.' },
    { href: '/crm/tasks', title: 'Follow-ups & pipeline', sub: 'What is due today, and where each customer is.' },
    { href: '/crm/leads', title: 'Leads', sub: 'Businesses and people you are bringing in.' },
    { href: '/users', title: 'People', sub: 'Search anyone on TaskDrop.' },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Dashboard' }]}
        title="Dashboard"
        sub={`${greeting(now)}. Here is TaskDrop today, ${now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })}.`}
      />

      <LiveStrip />

      <div className="needs-wrap">
        <NeedsYou limit={6} />
      </div>

      <div className="stats">
        <StatLink href="/tasks?filter=posted_today" icon="jobs" label="Jobs posted today" value={today.jobsPosted} />
        <StatLink href="/users?filter=new_today" icon="people" label="New people today" value={today.newPeople} />
        <StatLink href="/users?filter=available" icon="bolt" label="Workers available now" value={today.availableNow} />
        <StatLink href="/tasks?filter=waiting" icon="clock" label="Waiting for poster’s OK" value={today.waitingApproval} />
        <StatLink href="/tasks?filter=finished_today" icon="check" label="Jobs finished today" value={today.jobsFinished} />
      </div>

      <Card title="Your work" sub="Where to start.">
        <ul className="plain-list">
          {links.map((l) => (
            <li key={l.href}>
              <span>
                <Link href={l.href}>
                  <strong>{l.title}</strong>
                </Link>
                <span className="muted small block">{l.sub}</span>
              </span>
              <Link className="btn btn-small" href={l.href}>
                Open
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <LiveFeed />
    </>
  );
}
