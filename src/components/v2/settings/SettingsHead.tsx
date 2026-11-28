import * as v2 from '@/components/v2/ui';
import { roleLabel, type StaffRole } from '@/lib/staff-roles';

/** The Settings tabs (design SET_TABS). Same routes as today's Admin & configuration tabs. */
export const SET_TABS = [
  { href: '/settings/team', label: 'Team & access' },
  { href: '/settings', label: 'Money & timing' },
  { href: '/settings/switches', label: 'App switches' },
  { href: '/settings/rules', label: 'Rules' },
  { href: '/settings/controls', label: 'Web, Android & iOS' },
  { href: '/settings/integrations', label: 'Integrations' },
  { href: '/settings/health', label: 'System health' },
  { href: '/settings/audit', label: 'Audit log' },
  { href: '/security', label: 'My security' },
] as const;

export type SetTab = (typeof SET_TABS)[number]['href'];

/** Settings page header: breadcrumb, title, the nine tabs, and the "you can look" note for non-Admin roles. */
export function SettingsHead({ active, role, sub, right }: { active: SetTab; role: StaffRole; sub?: string; right?: React.ReactNode }) {
  const here = SET_TABS.find((t) => t.href === active)!.label;
  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'Settings', href: '/settings/team' }, { label: here }]}
        title={
          <>
            Settings <span className="wp8a-was">was “Admin &amp; configuration”</span>
          </>
        }
        sub={sub ?? 'Who runs TaskDrop, the numbers and switches the app runs on, and how its systems are doing.'}
        right={right}
      />
      <v2.Tabs label="Settings" items={SET_TABS.map((t) => ({ href: t.href, label: t.label, active: t.href === active }))} />
      {role !== 'admin' && active !== '/security' ? (
        <v2.Note tone="blue">
          You are <b>{roleLabel(role)}</b>: you can look, but only a full Admin can change things here.
        </v2.Note>
      ) : null}
    </>
  );
}
