'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { AlertsToggle } from '@/components/AlertsToggle';
import { Icon } from '@/components/Icon';
import { LiveIndicator } from '@/components/LiveIndicator';
import { useLive } from '@/components/LiveProvider';
import { roleLabel } from '@/lib/staff-roles';
import { setPrefCookie, useV2 } from './V2Frame';

type Theme = 'light' | 'dark' | 'system';

/**
 * v2 top bar: menu button (phone), global search, live chip, alerts, Payouts,
 * Needs you, date, theme button and the account menu (Hide test data, theme,
 * My security, Team & access, Sign out). The staging ribbon sits above it
 * (root layout).
 */
export function V2TopBar({
  email,
  seesMoney,
  seesSettings,
  unlockMoney,
  theme: initialTheme,
  signOut,
}: {
  email: string | null;
  seesMoney: boolean;
  seesSettings: boolean;
  /** The authenticator switch is on and this session has not entered a code (kept working, shown only then). */
  unlockMoney: boolean;
  theme: Theme;
  signOut: () => Promise<void>;
}) {
  const { role, hideTest, setDrawer } = useV2();
  const live = useLive();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const searchRef = useRef<HTMLInputElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);
  const needs = live?.needs ? live.needsSummary : null;
  const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });

  // "/" jumps to the search box, unless the person is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setMenu(false);
        return;
      }
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [menu]);

  const applyTheme = (next: Theme) => {
    setTheme(next);
    setPrefCookie('td_theme', next);
    if (next === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  };
  const isDark = () => theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const toggleHideTest = () => {
    setPrefCookie('td_hide_test', hideTest ? '0' : '1');
    startTransition(() => router.refresh());
  };

  return (
    <header className="v2-top">
      <button type="button" className="v2-iconbtn v2-menu-btn" aria-label="Open menu" aria-controls="v2-side" onClick={() => setDrawer(true)}>
        <Icon name="menu" />
      </button>
      <form action="/search" method="get" className="v2-search" role="search">
        <Icon name="search" size={16} />
        <input ref={searchRef} type="search" name="q" placeholder="Search people, jobs, payouts, help requests" aria-label="Search people, jobs, payouts and help requests" />
        <kbd aria-hidden="true">/</kbd>
      </form>
      <div className="v2-tb-right">
        <span className="hide-sm">
          <LiveIndicator />
        </span>
        <span className="hide-sm">
          <AlertsToggle />
        </span>
        {seesMoney ? (
          <Link href="/payouts" className="v2-iconbtn hide-sm" title="Workers' withdrawals: sent by RazorpayX or paid by hand">
            <Icon name="send" size={16} /> Payouts
          </Link>
        ) : null}
        {unlockMoney ? (
          <Link href="/security" className="v2-iconbtn hide-sm" title="The authenticator switch is on: enter a code on My security before money actions">
            <Icon name="lock" size={16} /> Unlock money actions
          </Link>
        ) : null}
        <Link
          href="/needs-you"
          className="v2-iconbtn"
          aria-label={needs ? `Needs you: ${needs.total} waiting, ${needs.late} late` : 'Needs you'}
          title={needs ? `Needs you: ${needs.total} waiting, ${needs.late} late` : 'Needs you'}
        >
          <Icon name="inbox" size={16} />
          {needs && needs.total > 0 ? <span className={`dot${needs.late ? ' red' : ''}`}>{needs.total}</span> : null}
        </Link>
        <span className="v2-datechip">{today}</span>
        <button type="button" className="v2-iconbtn" aria-label="Switch light or dark" title="Switch light or dark" onClick={() => applyTheme(isDark() ? 'light' : 'dark')}>
          <Icon name={isDark() ? 'sun' : 'moon'} size={16} />
        </button>
        <div className="v2-acct" ref={acctRef}>
          <button type="button" className="v2-iconbtn" aria-haspopup="menu" aria-expanded={menu} aria-label="Your account" onClick={() => setMenu((m) => !m)}>
            <Icon name="people" size={16} />
            <span className="hide-sm">{roleLabel(role)}</span>
            {hideTest ? <span className="dot" title="Test data hidden">T</span> : null}
          </button>
          {menu ? (
            <div className="v2-acct-menu" role="menu">
              <div className="who-line">
                <b>{email ?? 'Admin'}</b>
                <br />
                <span className="v2-tag-role">{roleLabel(role)}</span>
              </div>
              <button type="button" role="menuitemcheckbox" aria-checked={hideTest} onClick={toggleHideTest}>
                <Icon name="eye" size={16} /> {hideTest ? 'Show test data' : 'Hide test data'}
              </button>
              <button type="button" role="menuitem" onClick={() => applyTheme('system')} aria-current={theme === 'system' ? 'true' : undefined}>
                <Icon name="device" size={16} /> Theme: follow this device{theme === 'system' ? ' ✓' : ''}
              </button>
              <Link href="/security" role="menuitem">
                <Icon name="shield" size={16} /> My security
              </Link>
              {seesSettings ? (
                <Link href="/settings/team" role="menuitem">
                  <Icon name="people" size={16} /> Team & access{role !== 'admin' ? ' (view)' : ''}
                </Link>
              ) : null}
              <form action={signOut}>
                <button type="submit" role="menuitem">
                  <Icon name="logout" size={16} /> Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
