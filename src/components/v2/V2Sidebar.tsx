'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useLive } from '@/components/LiveProvider';
import { v2ActiveHref, v2NavFor, type V2Counts } from './nav';
import { useV2 } from './V2Frame';

const FOLD_KEY = 'td-v2-nav-folded';

/**
 * Grouped, foldable sidebar (design v2 improvement 1). A folded group shows
 * its waiting total; renamed items keep their old name underneath. On a phone
 * the same sidebar is the drawer (V2Frame opens it).
 */
export function V2Sidebar({ counts: initial }: { counts: V2Counts }) {
  const { role, collapsed, toggleCollapsed } = useV2();
  const pathname = usePathname() ?? '/';
  const live = useLive();
  const counts: V2Counts = {
    ...initial,
    ...(live?.nav ? { payouts: live.nav.payouts, disputes: live.nav.disputes, refunds: live.nav.refunds, support: live.nav.support } : {}),
    ...(live?.needs ? { needs: live.needsSummary.total } : {}),
  };
  const lateNeeds = (live?.needs ? live.needsSummary.late : 0) > 0;
  const [folded, setFolded] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FOLD_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setFolded(parsed.filter((x): x is string => typeof x === 'string'));
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = (title: string) => {
    setFolded((f) => {
      const next = f.includes(title) ? f.filter((t) => t !== title) : [...f, title];
      try {
        window.localStorage.setItem(FOLD_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const active = v2ActiveHref(pathname);

  return (
    <aside className="v2-side" aria-label="Main" id="v2-side">
      <Link href="/" className="v2-logo">
        <span className="mark" aria-hidden="true">
          TD
        </span>
        <span>
          TaskDrop<small>Admin panel</small>
        </span>
      </Link>
      <nav className="v2-nav">
        {v2NavFor(role).map((g) => {
          const closed = folded.includes(g.title);
          const total = g.items.reduce((s, it) => s + (it.count ? counts[it.count] ?? 0 : 0), 0);
          const id = `v2-grp-${g.title.replace(/\W+/g, '-').toLowerCase()}`;
          return (
            <div key={g.title} className={`v2-ngrp${closed ? ' closed' : ''}`}>
              <button type="button" className="v2-nhead" aria-expanded={!closed} aria-controls={id} onClick={() => toggle(g.title)}>
                {g.title}
                {total > 0 ? <span className="gcnt">{total}</span> : null}
                <Icon name="chevron" size={14} className="chev" />
              </button>
              <div className="v2-nitems" id={id}>
                {g.items.map((it) => {
                  const n = it.count ? counts[it.count] ?? 0 : 0;
                  const tone = it.count === 'needs' ? (lateNeeds ? 'red' : 'hot') : 'hot';
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className="v2-nl"
                      aria-current={active === it.href ? 'page' : undefined}
                      title={it.was ? `${it.label} (was "${it.was}")` : it.label}
                    >
                      <Icon name={it.icon} />
                      <span className="txt">
                        {it.label}
                        {it.was ? <span className="was">was &quot;{it.was}&quot;</span> : null}
                      </span>
                      {n > 0 ? (
                        <span className={`cnt ${tone}`} aria-label={`${n} waiting`}>
                          {n}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <button type="button" className="v2-collapse" onClick={toggleCollapsed} aria-pressed={collapsed}>
        <Icon name={collapsed ? 'arrow' : 'back'} size={16} />
        <span>{collapsed ? 'Show menu names' : 'Fold menu to icons'}</span>
      </button>
      <p className="v2-side-foot">Staff only. Every money action asks you to confirm first.</p>
    </aside>
  );
}
