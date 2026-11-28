'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { useLive } from '@/components/LiveProvider';
import { v2ActiveHref, v2Crumbs } from './nav';
import { useV2 } from './V2Frame';

/** Phone bottom bar (under 760 px): Home, Needs you, Money (Customers for Sales), People, Menu. */
export function V2BottomBar() {
  const { role, setDrawer } = useV2();
  const live = useLive();
  const active = v2ActiveHref(usePathname() ?? '/');
  const needs = live?.needs ? live.needsSummary.total : 0;
  const items: [string, string, string][] = [
    ['/', 'Home', 'home'],
    ['/needs-you', 'Needs you', 'inbox'],
    role === 'sales' ? ['/crm', 'Customers', 'heart'] : ['/money', 'Money', 'money'],
    ['/users', 'People', 'people'],
  ];
  return (
    <nav className="v2-bottombar" aria-label="Quick">
      {items.map(([href, label, icon]) => (
        <Link key={href} href={href} aria-current={active === href ? 'page' : undefined}>
          <Icon name={icon} />
          {label}
          {href === '/needs-you' && needs > 0 ? <span className="dot">{needs}</span> : null}
        </Link>
      ))}
      <button type="button" onClick={() => setDrawer(true)} aria-controls="v2-side">
        <Icon name="menu" />
        Menu
      </button>
    </nav>
  );
}

/** Breadcrumbs from the address, shown only when the page draws none of its own (CSS :has). */
export function V2AutoCrumbs() {
  const path = usePathname() ?? '/';
  return <V2AutoCrumbsFor path={path} />;
}

function V2AutoCrumbsFor({ path }: { path: string }) {
  const crumbs = v2Crumbs(path);
  if (!crumbs.length) return null;
  return (
    <nav className="v2-autocrumbs" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {crumbs.map((c, i) => (
        <span key={i} className="v2-crumb-part">
          <span className="sepc" aria-hidden="true">
            ›
          </span>
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}
