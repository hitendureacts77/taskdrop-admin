import type { ReactNode } from 'react';
import * as v2 from '@/components/v2/ui';
import { roleLabel, type StaffRole } from '@/lib/staff-roles';

/** The settings tabs, same order as today's Admin & configuration tabs (design SET_TABS). */
const TABS = [
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

export type SettingsToolsTab = '/settings/rules' | '/settings/integrations' | '/settings/health' | '/settings/audit';

/**
 * Header for the v2 settings tools pages (WP8b): breadcrumb, title, the
 * settings tabs, and the "you can look, but not change" line for anyone
 * who is not a full Admin (F418).
 */
export function SettingsToolsHead({ active, sub, role, right }: { active: SettingsToolsTab; sub: ReactNode; role: StaffRole; right?: ReactNode }) {
  const label = TABS.find((t) => t.href === active)?.label ?? 'Settings';
  return (
    <>
      <v2.PageHeader
        title={
          <>
            Settings <span className="wp8b-was">was “Admin &amp; configuration”</span>
          </>
        }
        sub={sub}
        crumbs={[{ label: 'Settings', href: '/settings/team' }, { label }]}
        right={right}
      />
      <v2.Tabs label="Settings" items={TABS.map((t) => ({ href: t.href, label: t.label, active: t.href === active }))} />
      {role !== 'admin' ? (
        <div className="wp8b-gap">
          <v2.Note tone="blue" title="You can look, but not change">
            You are signed in as <b>{roleLabel(role)}</b>. Only a full Admin can change things here.
          </v2.Note>
        </div>
      ) : null}
    </>
  );
}
