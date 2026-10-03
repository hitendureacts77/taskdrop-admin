import Link from 'next/link';
import type { ReactNode } from 'react';
import { percentChange, rupeesParts } from '@/lib/format';
import type { Tone } from '@/lib/labels';
import { Icon } from './Icon';

/** ₹1,23,456.78 with the paise a size smaller, so the rupees read first. */
export function Money({ minor, className }: { minor: number; className?: string }) {
  const p = rupeesParts(minor);
  return (
    <span className={`money${className ? ` ${className}` : ''}`}>
      {p.negative ? '−' : ''}
      {p.rupees}
      <span className="paise">{p.paise}</span>
    </span>
  );
}

/** Status as a coloured dot and a word. */
export function Pill({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={`pill pill-${tone}`} title={title}>
      <span className="pill-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export type Crumb = { href?: string; label: string };

export function PageHeader({ crumbs, title, sub, right }: { crumbs?: Crumb[]; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-main">
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="crumbs">
            <Link href="/">Home</Link>
            {crumbs.map((c, i) => (
              <span key={i}>
                <span aria-hidden="true"> › </span>
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </span>
            ))}
          </nav>
        ) : null}
        <h1>{title}</h1>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      {right ? <div className="page-head-right">{right}</div> : null}
    </header>
  );
}

export function Card({
  title,
  sub,
  right,
  children,
  id,
  flush,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  id?: string;
  /** No inner padding, for tables that run edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className="card" id={id}>
      {title || right ? (
        <div className="card-head">
          <div>
            {title ? <h2 className="card-title">{title}</h2> : null}
            {sub ? <p className="card-sub">{sub}</p> : null}
          </div>
          {right ? <div className="card-head-right">{right}</div> : null}
        </div>
      ) : null}
      <div className={flush ? 'card-flush' : 'card-body'}>{children}</div>
    </section>
  );
}

export function Notice({ tone = 'gold', title, children, icon }: { tone?: 'gold' | 'red' | 'green' | 'blue'; title?: ReactNode; children?: ReactNode; icon?: string }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'red' ? 'alert' : undefined}>
      <Icon name={icon ?? (tone === 'green' ? 'check' : tone === 'red' ? 'alert' : 'clock')} size={20} />
      <div>
        {title ? <strong className="notice-title">{title}</strong> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}

/** Numbered plain-language steps. Open by default; collapsible once someone knows it. */
export function HowItWorks({ title = 'How it works', steps, open = true }: { title?: string; steps: ReactNode[]; open?: boolean }) {
  return (
    <details className="help" open={open}>
      <summary>
        <Icon name="help" size={16} /> {title}
      </summary>
      <ol className="help-steps">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="help-num" aria-hidden="true">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** "▲ 12% more than yesterday", in words, with no colour-only meaning. */
export function Delta({ current, previous, versus, onDark }: { current: number; previous: number; versus: string; onDark?: boolean }) {
  const cls = `delta${onDark ? ' on-dark' : ''}`;
  if (!previous && !current) return <span className={cls}>Nothing {versus} either</span>;
  if (!previous) return <span className={`${cls} up`}>▲ Nothing {versus}</span>;
  const pct = percentChange(current, previous) ?? 0;
  if (Math.abs(pct) < 0.5) return <span className={cls}>About the same as {versus}</span>;
  const up = pct > 0;
  return (
    <span className={`${cls} ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(1)}% {up ? 'more' : 'less'} than {versus}
    </span>
  );
}

export type TabItem = { href: string; label: string; active: boolean; count?: number };

/** A row of link tabs (filters and ranges live in the URL, so every view can be bookmarked or shared). */
export function Tabs({ items, label, small }: { items: TabItem[]; label: string; small?: boolean }) {
  return (
    <nav className={`seg${small ? ' seg-small' : ''}`} aria-label={label}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? 'true' : undefined} scroll={false}>
          {t.label}
          {t.count !== undefined ? <span className="seg-count">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function SearchBox({
  action,
  defaultValue,
  placeholder,
  hidden,
}: {
  action: string;
  defaultValue?: string;
  placeholder: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} method="get" className="search" role="search">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Icon name="search" size={16} />
      <input className="search-input" type="search" name="q" defaultValue={defaultValue} placeholder={placeholder} aria-label={placeholder} />
      <button className="btn btn-small" type="submit">
        Search
      </button>
    </form>
  );
}

export function Pager({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  if (total <= pageSize && page === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="pager">
      <span>
        Showing {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
      </span>
      <span className="pager-links">
        {page > 0 ? (
          <Link className="btn btn-small" href={hrefFor(page - 1)}>
            ← Newer
          </Link>
        ) : null}
        {to < total ? (
          <Link className="btn btn-small" href={hrefFor(page + 1)}>
            Older →
          </Link>
        ) : null}
      </span>
    </div>
  );
}

export function Empty({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

/** Label / value rows, for detail pages. */
export function KV({ rows }: { rows: { label: ReactNode; value: ReactNode; hint?: ReactNode; strong?: boolean }[] }) {
  return (
    <dl className="kv">
      {rows.map((r, i) => (
        <div key={i} className={r.strong ? 'kv-row kv-strong' : 'kv-row'}>
          <dt>
            {r.label}
            {r.hint ? <span className="kv-hint">{r.hint}</span> : null}
          </dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A small number that opens the list behind it. */
export function StatLink({ href, icon, label, value, sub }: { href: string; icon: string; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Link href={href} className="stat">
      <span className="stat-icon" aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <span className="stat-text">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {sub ? <span className="stat-sub">{sub}</span> : null}
      </span>
      <Icon name="arrow" size={16} className="stat-go" />
    </Link>
  );
}

export function PersonLink({ id, name }: { id: string | null | undefined; name: string | null | undefined }) {
  if (!id) return <span className="muted">{name ?? '—'}</span>;
  return <Link href={`/users/${id}`}>{name ?? 'Someone'}</Link>;
}

export function JobLink({ id, title }: { id: string | null | undefined; title: string | null | undefined }) {
  if (!id) return <span>{title ?? '—'}</span>;
  return (
    <Link href={`/tasks/${id}`} className="job-link">
      {title ?? 'Job'}
    </Link>
  );
}

/** A stacked bar with a text list beside it; the colours are never the only way to read it. */
export function StackBar({ parts, label }: { parts: { value: number; color: string; label: string }[]; label: string }) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0);
  return (
    <div className="stackbar" role="img" aria-label={label}>
      {total > 0
        ? parts.map((p, i) => (p.value > 0 ? <span key={i} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} /> : null))
        : <span style={{ width: '100%', background: 'var(--line)' }} />}
    </div>
  );
}

export function Swatch({ color }: { color: string }) {
  return <span className="swatch" style={{ background: color }} aria-hidden="true" />;
}
