/**
 * Admin v2 shared components (server-safe: no hooks). Import as a namespace so
 * the names never clash with today's components/ui.tsx:
 *
 *   import * as v2 from '@/components/v2/ui';
 *   <v2.PageHeader title="Payouts" crumbs={[{ label: 'Payouts' }]} />
 *
 * Every one of them renders v2-* classes from src/app/v2.css, which only
 * match inside the v2 gate. Use them only on the v2 path of a page.
 * Full guide: docs/admin-redesign/07-build-plan-v2.md, "Foundation API".
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';

export type Crumb = { label: string; href?: string };
export type Tone = 'ok' | 'earn' | 'wait' | 'bad' | 'danger' | 'mut';
export type TileTone = 'gold' | 'jade' | 'blue' | 'orange' | 'red';
export type NoteTone = 'gold' | 'blue' | 'red' | 'orange' | 'jade' | 'plain';

/** Breadcrumb (Home first) + title + subtitle + right-side buttons. Every v2 page starts with it. */
export function PageHeader({ title, sub, crumbs, right }: { title: ReactNode; sub?: ReactNode; crumbs?: Crumb[]; right?: ReactNode }) {
  return (
    <>
      {crumbs?.length ? (
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {crumbs.map((c, i) => (
            <span key={i} className="v2-crumb-part">
              <span className="sepc" aria-hidden="true">
                ›
              </span>
              {c.href && i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}
      <header className="v2-ph">
        <div>
          <h1>{title}</h1>
          {sub ? <p>{sub}</p> : null}
        </div>
        {right ? <div className="right">{right}</div> : null}
      </header>
    </>
  );
}

export function Grid({ cols = 2, children, className }: { cols?: 2 | 3 | 4 | 5 | 'main'; children: ReactNode; className?: string }) {
  return <div className={`v2-grid ${cols === 'main' ? 'gmain' : `g${cols}`}${className ? ` ${className}` : ''}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="v2-sec-t">{children}</h2>;
}

export function Card({
  title,
  sub,
  right,
  children,
  id,
  tone,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  id?: string;
  /** warn = orange border; new = dashed border for a whole new block. */
  tone?: 'warn' | 'new';
}) {
  return (
    <section className={`v2-card${tone ? ` ${tone}` : ''}`} id={id}>
      {title || right ? (
        <div className="v2-ch">
          <div>
            {title ? <h3>{title}</h3> : null}
            {sub ? <p className="sub-t">{sub}</p> : null}
          </div>
          {right ? <div className="right">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A big number. With href the whole tile is a link. */
export function Tile({ label, value, foot, tone, href, small }: { label: ReactNode; value: ReactNode; foot?: ReactNode; tone?: TileTone; href?: string; small?: boolean }) {
  const cls = `v2-tile${tone ? ` ${tone}` : ''}${small ? ' sm' : ''}`;
  const body = (
    <>
      <div className="lbl">{label}</div>
      <div className="big">{value}</div>
      {foot ? <div className="foot">{foot}</div> : null}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Status: a dot and a word. ok = jade, earn = blue (worker), wait = gold (held money), bad = orange, danger = red, mut = grey. */
export function Pill({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={`v2-pill ${tone}`} title={title}>
      {children}
    </span>
  );
}

/** Blue dashed "New": anything today's admin does not have. */
export function NewTag({ children = 'New' }: { children?: ReactNode }) {
  return <span className="v2-tag-new">{children}</span>;
}
/** Grey "Not used since Plan B": pre-Plan B leftovers kept on purpose (owner decision 1). */
export function OldTag({ children = 'Not used since Plan B' }: { children?: ReactNode }) {
  return <span className="v2-tag-old">{children}</span>;
}
/** "Off for now · turn on later": authenticator pieces (two-step sign-in is not used now). */
export function OffTag({ children = 'Off for now · turn on later' }: { children?: ReactNode }) {
  return <span className="v2-tag-off">{children}</span>;
}
/** Yellow TEST label on a seed / e2e row (see lib/test-data.ts). */
export function TestTag({ show = true }: { show?: boolean }) {
  return show ? <span className="v2-tag-test">TEST</span> : null;
}

export function Note({ tone = 'plain', title, children }: { tone?: NoteTone; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`v2-note${tone === 'plain' ? '' : ` ${tone}`}`} role={tone === 'red' ? 'alert' : undefined}>
      {title ? <b className="t">{title}</b> : null}
      {children}
    </div>
  );
}

/** The one wording for a missing table/RPC/key on this server. Never name a migration number in the main text. */
export function SetupNotice({ what, detail }: { what: ReactNode; detail?: string }) {
  return (
    <Note tone="gold" title="Not set up on this server yet">
      {what}
      {detail ? <span className="v2-mono v2-muted"> ({detail})</span> : null}
    </Note>
  );
}

/** Red launch blocker strip, e.g. developer sign-in (dev_otp_for_all) still on. */
export function Blocker({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="v2-blocker" role="alert">
      <span className="ic2" aria-hidden="true">
        <Icon name="alert" size={18} />
      </span>
      <div>
        <b>{title}</b>
        {children ? <div>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, children, icon = 'inbox' }: { title: ReactNode; children?: ReactNode; icon?: string }) {
  return (
    <div className="v2-empty">
      <div className="eic" aria-hidden="true">
        <Icon name={icon} size={22} />
      </div>
      <b>{title}</b>
      {children}
    </div>
  );
}

/** Grey shimmer lines while a part of the page loads (use in loading.tsx or a Suspense fallback). */
export function Loading({ lines = 4, label = 'Loading' }: { lines?: number; label?: string }) {
  return (
    <div role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="v2-sk" style={{ width: `${90 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

/** A block that could not load: plain words, and the technical reason small. */
export function ErrorState({ title = 'Could not load this', detail, retryHref }: { title?: ReactNode; detail?: string; retryHref?: string }) {
  return (
    <Note tone="red" title={title}>
      Try again in a minute. If it keeps happening, tell the developer.
      {detail ? <div className="v2-mono v2-muted">{detail}</div> : null}
      {retryHref ? (
        <div>
          <Link href={retryHref}>Try again</Link>
        </div>
      ) : null}
    </Note>
  );
}

export function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="v2-kv">
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One change in plain words: "Payout method: Paid by hand → RazorpayX". */
export function BeforeAfter({ label, before, after }: { label?: ReactNode; before: ReactNode; after: ReactNode }) {
  const empty = (v: ReactNode) => (v === null || v === undefined || v === '' ? <em>nothing</em> : v);
  return (
    <div className="v2-ba">
      {label ? <span className="k">{label}:</span> : null}
      <span className="from">{empty(before)}</span>
      <span aria-label="changed to">→</span>
      <span className="to">{empty(after)}</span>
    </div>
  );
}

/** Before → after for a whole object (audit log). Unchanged keys are left out; raw keys go to `labels` for plain words. */
export function DiffList({ before, after, labels = {} }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null; labels?: Record<string, string> }) {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  const show = (v: unknown): string => (v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'On' : 'Off') : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const changed = keys.filter((k) => show(before?.[k]) !== show(after?.[k]));
  if (!changed.length) return <span className="v2-muted">No change</span>;
  return (
    <div className="v2-row">
      {changed.map((k) => (
        <BeforeAfter key={k} label={labels[k] ?? k.replace(/_/g, ' ')} before={show(before?.[k])} after={show(after?.[k])} />
      ))}
    </div>
  );
}

export type TabItem = { href: string; label: ReactNode; count?: number; hot?: boolean; active: boolean };
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav className="v2-tabs" aria-label={label}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? 'page' : undefined}>
          {t.label}
          {t.count !== undefined ? <span className={`c${t.hot ? ' hot' : ''}`}>{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** Filter chips as links (?filter=...). */
export function Chips({ items, label }: { items: { href: string; label: ReactNode; count?: number; active: boolean }[]; label: string }) {
  return (
    <nav className="v2-chips" aria-label={label}>
      {items.map((c) => (
        <Link key={c.href} href={c.href} className="v2-chip" aria-current={c.active ? 'page' : undefined}>
          {c.label}
          {c.count !== undefined ? <b>{c.count}</b> : null}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Search box for a table: a plain GET form, so it works without JavaScript and
 * keeps other query params given in `keep` (e.g. the current filter).
 */
export function TableSearch({ action, value, placeholder = 'Search', keep = {}, name = 'q' }: { action: string; value?: string; placeholder?: string; keep?: Record<string, string | undefined>; name?: string }) {
  return (
    <form className="v2-filters" action={action} method="get" role="search">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input type="search" name={name} defaultValue={value} placeholder={placeholder} aria-label={placeholder} />
      <button type="submit" className="v2-btn sm">
        Search
      </button>
    </form>
  );
}

export type Column = { label: string; right?: boolean };
export type Row = {
  key: string;
  cells: ReactNode[];
  /** Whole-row link: the first cell becomes a link (keyboard friendly), the row is clickable-looking. */
  href?: string;
  /** Seed / e2e row: adds the TEST label to the first cell. */
  test?: boolean;
  /** Red row: past its promise (e.g. a withdrawal older than 7 days). */
  late?: boolean;
};

/**
 * The v2 table. On a phone (under 760 px) each row becomes a card with the
 * column label beside each value (data-l), so there is never sideways scroll.
 * Put it inside <Card> with no padding tricks: it bleeds to the card edges.
 */
export function DataTable({ columns, rows, empty, caption }: { columns: Column[]; rows: Row[]; empty?: ReactNode; caption?: string }) {
  if (!rows.length) return <Empty title={empty ?? 'Nothing here'} />;
  return (
    <div className="v2-tblwrap">
      <table className="v2-tbl">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} scope="col" className={c.right ? 'r' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={[r.href ? 'go' : '', r.late ? 'late' : ''].filter(Boolean).join(' ') || undefined}>
              {r.cells.map((cell, i) => (
                <td key={i} data-l={columns[i]?.label ?? ''} className={columns[i]?.right ? 'r' : undefined}>
                  {i === 0 && r.href ? (
                    <Link href={r.href} className="rowlink">
                      {cell}
                    </Link>
                  ) : (
                    cell
                  )}
                  {i === 0 ? <TestTag show={Boolean(r.test)} /> : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Showing 1–50 of 312" with Newer / Older links. page is 0-based. */
export function Pager({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  if (total <= pageSize && page === 0) return null;
  const from = Math.min(total, page * pageSize + 1);
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="v2-pager">
      <span>
        Showing {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
      </span>
      <span className="v2-row">
        {page > 0 ? (
          <Link className="v2-btn sm" href={hrefFor(page - 1)}>
            ← Newer
          </Link>
        ) : null}
        {to < total ? (
          <Link className="v2-btn sm" href={hrefFor(page + 1)}>
            Older →
          </Link>
        ) : null}
      </span>
    </div>
  );
}
