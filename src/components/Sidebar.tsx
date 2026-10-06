'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

type Counts = { payouts: number; disputes: number; refunds: number; support: number };

type Item = { href: string; label: string; icon: string; badge?: keyof Counts; alert?: boolean };

const SECTIONS: { title: string | null; items: Item[] }[] = [
  { title: null, items: [{ href: '/', label: 'Dashboard', icon: 'home' }] },
  {
    title: 'Money',
    items: [
      { href: '/money', label: 'Earnings & escrow', icon: 'money' },
      { href: '/payouts', label: 'Payouts', icon: 'send', badge: 'payouts', alert: true },
      { href: '/refunds', label: 'Refunds', icon: 'undo', badge: 'refunds', alert: true },
    ],
  },
  {
    title: 'People & jobs',
    items: [
      { href: '/tasks', label: 'Jobs', icon: 'jobs' },
      { href: '/users', label: 'People', icon: 'people' },
      { href: '/disputes', label: 'Disputes', icon: 'scale', badge: 'disputes', alert: true },
      { href: '/support', label: 'Help requests', icon: 'help', badge: 'support' },
      { href: '/copyright', label: 'Copyright notices', icon: 'alert' },
      { href: '/promotions', label: 'Promotions', icon: 'megaphone' },
    ],
  },
  {
    title: 'Customers (CRM)',
    items: [
      { href: '/crm', label: 'Customer hub', icon: 'shield' },
      { href: '/crm/segments', label: 'Segments', icon: 'search' },
      { href: '/crm/messages', label: 'Messages', icon: 'megaphone' },
    ],
  },
  {
    title: 'Reports & settings',
    items: [
      { href: '/reports', label: 'Reports', icon: 'chart' },
      { href: '/settings', label: 'Settings', icon: 'settings' },
      { href: '/security', label: 'Security', icon: 'shield' },
    ],
  },
];

export function Sidebar({ counts }: { counts: Counts }) {
  const pathname = usePathname() ?? '/';
  const isActive = (href: string) => (href === '/' || href === '/crm' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

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
              const n = item.badge ? counts[item.badge] : 0;
              return (
                <Link key={item.href} href={item.href} className="nav-link" aria-current={isActive(item.href) ? 'page' : undefined}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {n > 0 ? (
                    <span className={`nav-badge${item.alert ? ' alert' : ''}`} aria-label={`${n} waiting`}>
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
