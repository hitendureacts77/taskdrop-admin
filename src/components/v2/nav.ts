/**
 * Admin v2 navigation: groups, items, old-name hints and badge keys
 * (design: docs/admin-redesign/design/admin-design-v2.html, NAV). Pure, so the
 * sidebar, the phone drawer, the bottom bar and the automatic breadcrumbs all
 * read the same list.
 */
import type { StaffRole } from '../../lib/staff-roles.ts';

/** Badge keys. payouts/refunds/disputes/support come from today's nav counts; needs from the live panel; the rest from getV2NavCounts (WP10). */
export type V2CountKey = 'needs' | 'payouts' | 'refunds' | 'disputes' | 'support' | 'check' | 'flags' | 'copyright' | 'alerts' | 'feedback' | 'catalog';
export type V2Counts = Partial<Record<V2CountKey, number>>;

/** Who may see an item: both 'money' and 'admin' items are hidden from Sales (staffCanSee). */
export type V2See = 'money' | 'admin';

export type V2NavItem = { href: string; label: string; icon: string; was?: string; count?: V2CountKey; see?: V2See };
export type V2NavGroup = { title: string; see?: V2See; items: V2NavItem[] };

export const V2_NAV: V2NavGroup[] = [
  {
    title: 'Today',
    items: [
      { href: '/', label: 'Dashboard', icon: 'home' },
      { href: '/needs-you', label: 'Needs you', icon: 'inbox', was: 'Needs you now', count: 'needs' },
    ],
  },
  {
    title: 'Money',
    see: 'money',
    items: [
      { href: '/money', label: 'Earnings & escrow', icon: 'money' },
      { href: '/payouts', label: 'Payouts', icon: 'send', count: 'payouts' },
      { href: '/refunds', label: 'Refunds', icon: 'undo', count: 'refunds' },
      { href: '/disputes', label: 'Disputes', icon: 'scale', count: 'disputes' },
      { href: '/money/reconcile', label: 'Money check', icon: 'check', count: 'check' },
      { href: '/promotions', label: 'Promotions', icon: 'megaphone' },
    ],
  },
  {
    title: 'Jobs & people',
    items: [
      { href: '/tasks', label: 'Jobs', icon: 'jobs' },
      { href: '/users', label: 'People', icon: 'people' },
      { href: '/devices', label: 'Devices', icon: 'device' },
    ],
  },
  {
    title: 'Help & safety',
    items: [
      { href: '/support', label: 'Help requests', icon: 'help', count: 'support' },
      { href: '/reports-queue', label: 'Flagged content', icon: 'flag', was: 'Reports', count: 'flags' },
      { href: '/copyright', label: 'Copyright notices', icon: 'copy', count: 'copyright' },
      { href: '/alerts', label: 'Team alerts', icon: 'bell', was: 'Alerts', count: 'alerts' },
      { href: '/feedback', label: 'Feedback board', icon: 'megaphone', count: 'feedback' },
      { href: '/catalog', label: 'Skills & categories', icon: 'tag', count: 'catalog' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { href: '/crm', label: 'Customer hub', icon: 'heart' },
      { href: '/crm/tasks', label: 'Follow-ups & pipeline', icon: 'list' },
      { href: '/crm/leads', label: 'Leads', icon: 'target' },
      { href: '/crm/segments', label: 'Segments', icon: 'filter' },
      { href: '/crm/messages', label: 'Messages', icon: 'send' },
    ],
  },
  {
    title: 'Reports & settings',
    items: [
      { href: '/reports', label: 'Business reports', icon: 'chart', see: 'money' },
      { href: '/team/performance', label: 'Team performance', icon: 'star' },
      { href: '/settings/team', label: 'Settings', icon: 'settings', was: 'Admin & configuration', see: 'admin' },
      { href: '/security', label: 'My security', icon: 'shield' },
    ],
  },
];

/** Sales sees no company money and no settings; every other role sees every item (staff-roles.ts staffCanSee). */
export function v2ItemVisible(role: StaffRole, group: V2NavGroup, item: V2NavItem): boolean {
  const see = item.see ?? group.see;
  return !(see && role === 'sales');
}

export function v2NavFor(role: StaffRole): V2NavGroup[] {
  return V2_NAV.map((g) => ({ ...g, items: g.items.filter((i) => v2ItemVisible(role, g, i)) })).filter((g) => g.items.length > 0);
}

/** The nav item a path belongs to (longest match); every /settings page belongs to Settings. */
export function v2ActiveHref(path: string): string {
  if (path === '/settings' || path.startsWith('/settings/')) return '/settings/team';
  if (path === '/money/entries') return '/money';
  let best = '/';
  for (const g of V2_NAV) {
    for (const it of g.items) {
      if (it.href !== '/' && (path === it.href || path.startsWith(`${it.href}/`)) && it.href.length > best.length) best = it.href;
    }
  }
  return best;
}

const EXTRA_LABELS: Record<string, string> = {
  '/money/entries': 'Earnings entries',
  '/search': 'Search',
  '/settings': 'Money & timing',
  '/settings/switches': 'App switches',
  '/settings/controls': 'Web, Android & iOS',
  '/settings/rules': 'Rules',
  '/settings/integrations': 'Integrations',
  '/settings/health': 'System health',
  '/settings/audit': 'Audit log',
  '/settings/team': 'Team & access',
};

export type V2Crumb = { label: string; href?: string };

/**
 * Breadcrumbs for a path, without Home. The last crumb has no link.
 * Detail pages (/users/<id>) end in "Details"; a page that knows the name passes its own crumbs to PageHeaderV2.
 */
export function v2Crumbs(path: string): V2Crumb[] {
  if (path === '/' || path === '') return [];
  const labelFor = (p: string): string | null => {
    if (EXTRA_LABELS[p]) return EXTRA_LABELS[p]!;
    for (const g of V2_NAV) for (const it of g.items) if (it.href === p) return it.label;
    return null;
  };
  const parts = path.split('/').filter(Boolean);
  const out: V2Crumb[] = [];
  if (parts[0] === 'settings' && path !== '/settings/team') out.push({ label: 'Settings', href: '/settings/team' });
  let acc = '';
  parts.forEach((part, i) => {
    acc += `/${part}`;
    // "/settings" itself is Money & timing; on deeper settings pages the "Settings" crumb stands for it.
    if (acc === '/settings' && parts.length > 1) return;
    const label = labelFor(acc);
    if (label) out.push({ label, href: acc });
    else if (i === parts.length - 1) out.push({ label: 'Details' });
  });
  const uniq = out.filter((c, i) => i === 0 || c.label !== out[i - 1]!.label);
  if (uniq.length) uniq[uniq.length - 1] = { label: uniq[uniq.length - 1]!.label };
  return uniq;
}
