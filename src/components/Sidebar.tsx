'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import { useLive } from './LiveProvider';

type Counts = { payouts: number; disputes: number; refunds: number; support: number };

type Item = { href: string; label: string; icon: string; badge?: keyof Counts; alert?: boolean; /** The live "Needs you now" total. */ needs?: boolean };

const SECTIONS: { title: string | null; items: Item[] }[] = [
  {
    title: null,
    items: [
      { href: '/', label: 'Dashboard', icon: 'home' },
      { href: '/needs-you', label: 'Needs you now', icon: 'bolt', needs: true },
    ],
  },
  {
    title: 'Money',
    items: [
      { href: '/money', label: 'Earnings & escrow', icon: 'money' },
      { href: '/payouts', label: 'Payouts', icon: 'send', badge: 'payouts', alert: true },
      { href: '/refunds', label: 'Refunds', icon: 'undo', badge: 'refunds', alert: true },
      { href: '/money/reconcile', label: 'Money check', icon: 'check' },
    ],
  },
  {
    title: 'People & jobs',
    items: [
      { href: '/tasks', label: 'Jobs', icon: 'jobs' },
      { href: '/users', label: 'People', icon: 'people' },
      { href: '/devices', label: 'Devices', icon: 'device' },
      { href: '/disputes', label: 'Disputes', icon: 'scale', badge: 'disputes', alert: true },
      { href: '/reports-queue', label: 'Reports', icon: 'alert' },
      { href: '/support', label: 'Help requests', icon: 'help', badge: 'support' },
      { href: '/copyright', label: 'Copyright notices', icon: 'alert' },
      { href: '/promotions', label: 'Promotions', icon: 'megaphone' },
    ],
  },
  {
    title: 'Customers (CRM)',
    items: [
      { href: '/crm', label: 'Customer hub', icon: 'shield' },
      { href: '/crm/tasks', label: 'Follow-ups & pipeline', icon: 'clock' },
      { href: '/crm/leads', label: 'Leads', icon: 'people' },
      { href: '/crm/segments', label: 'Segments', icon: 'search' },
      { href: '/crm/messages', label: 'Messages', icon: 'megaphone' },
    ],
  },
  {
    title: 'Reports & settings',
    items: [
      { href: '/reports', label: 'Business reports', icon: 'chart' },
      { href: '/team/performance', label: 'Team performance', icon: 'star' },
      { href: '/settings/team', label: 'Admin & configuration', icon: 'settings' },
      { href: '/security', label: 'Security', icon: 'shield' },
    ],
  },
];

export function Sidebar({ counts: initial }: { counts: Counts }) {
  const pathname = usePathname() ?? '/';
  // The live re-reads keep the badges current between page loads.
  const live = useLive();
  const counts = live?.nav ?? initial;
  const needs = live?.needs ? live.needsSummary : null;
  const isActive = (href: string) =>
    href === '/settings/team'
      ? pathname === '/settings' || pathname.startsWith('/settings/')
      : href === '/' || href === '/crm' || href === '/money'
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sidebar" aria-label="Main">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          TD
        </span>
        <span>
          <span className="brand-name">TaskDrop</span>
          <span className="brand-sub">Admin panel</span>
        </span>
      </Link>
      <nav>
        {SECTIONS.map((section) => (
          <div key={section.title ?? 'top'}>
            {section.title ? <div className="nav-section">{section.title}</div> : null}
            {section.items.map((item) => {
              const n = item.needs ? (needs?.total ?? 0) : item.badge ? counts[item.badge] : 0;
              const urgent = item.needs ? (needs?.late ?? 0) > 0 : item.alert;
              return (
                <Link key={item.href} href={item.href} className="nav-link" aria-current={isActive(item.href) ? 'page' : undefined}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {n > 0 ? (
                    <span className={`nav-badge${urgent ? ' alert' : ''}`} aria-label={item.needs && needs?.late ? `${n} waiting, ${needs.late} late` : `${n} waiting`}>
                      {n}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <p className="sidebar-foot">Staff only. Every money action asks you to confirm first.</p>
    </aside>
  );
}
