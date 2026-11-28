/**
 * Small pieces shared by the v2 Customers pages (work package WP6). Server-safe.
 * Styles: src/app/v2/wp6-crm.css (every rule starts with [data-v2]).
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import * as v2 from '@/components/v2/ui';
import { initials } from '@/lib/labels';

export const CUSTOMERS_CRUMB: v2.Crumb = { label: 'Customers', href: '/crm' };

/** Header shortcuts under the hub title (F318). */
export function CrmShortcuts() {
  return (
    <v2.Chips
      label="Customer shortcuts"
      items={[
        { href: '/crm/segments?owner=me', label: 'My customers', active: false },
        { href: '/crm/leads', label: 'Leads', active: false },
        { href: '/crm/segments', label: 'Segments', active: false },
        { href: '/crm/messages', label: 'Send a message', active: false },
      ]}
    />
  );
}

/** A foldable "how it works" box: a title and short numbered steps. */
export function How({ title, steps, open }: { title: string; steps: [string, ReactNode][]; open?: boolean }) {
  return (
    <details className="wp6-how" open={open}>
      <summary>{title}</summary>
      <ol>
        {steps.map(([k, v]) => (
          <li key={k}>
            <b>{k}</b>
            <span>{v}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Round initials and a link to the person's page. */
export function Who({ id, name, sub, test }: { id: string | null; name: string | null; sub?: ReactNode; test?: boolean }) {
  if (!id) return <span className="v2-muted">—</span>;
  const n = name ?? 'Someone';
  return (
    <span className="wp6-who">
      <span className="av" aria-hidden="true">
        {initials(n)}
      </span>
      <span className="nm">
        <Link href={`/users/${id}`}>{n}</Link>
        <v2.TestTag show={Boolean(test)} />
        {sub ? <span className="sub">{sub}</span> : null}
      </span>
    </span>
  );
}

/** Cut long text for a table cell. */
export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export const nf = (n: number) => n.toLocaleString('en-IN');
