import Link from 'next/link';
import { Icon } from '@/components/Icon';
import type { TodayCounts } from '@/lib/data';
import * as v2 from '../ui';
import { greeting, longDate, TodayStats } from './parts';
import { V2LiveFeed } from './V2LiveFeed';
import { V2NeedsCard } from './V2NeedsList';
import { V2RightNow } from './V2RightNow';

/**
 * Admin v2 dashboard for the Sales role: customers, jobs and leads, with none
 * of the company's money read at all (page.tsx returns before any money read).
 */
export function V2SalesDashboard({ today, now: nowIso }: { today: TodayCounts; now: string }) {
  const now = new Date(nowIso);
  const links = [
    { href: '/crm', icon: 'heart', title: 'Customer hub' },
    { href: '/crm/tasks', icon: 'list', title: 'Follow-ups & pipeline' },
    { href: '/crm/leads', icon: 'target', title: 'Leads' },
    { href: '/users', icon: 'people', title: 'People' },
  ];
  return (
    <>
      <v2.PageHeader crumbs={[{ label: 'Dashboard' }]} title={greeting(now)} sub={`${longDate(now)} · Sales view: no company money is read on this page.`} />
      <V2RightNow />
      <v2.Grid cols="main" className="wp4-mt">
        <V2NeedsCard limit={6} sales />
        <v2.Card title="Your work" sub="Where to start.">
          <div className="wp4-actlist">
            {links.map((l) => (
              <Link key={l.href} className="v2-btn" href={l.href}>
                <Icon name={l.icon} size={16} /> {l.title}
              </Link>
            ))}
          </div>
        </v2.Card>
      </v2.Grid>
      <TodayStats today={today} order="sales" />
      <div className="wp4-mt">
        <V2LiveFeed />
      </div>
    </>
  );
}
