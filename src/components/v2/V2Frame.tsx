'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppEnvironment } from '@/lib/environment';
import type { StaffRole } from '@/lib/staff-roles';

/**
 * The client side of the v2 shell: who is signed in (role), which
 * environment, whether the phone drawer is open and whether the sidebar is
 * folded to icons. Every v2 client component reads it with useV2().
 */
export type V2State = {
  role: StaffRole;
  env: AppEnvironment;
  hideTest: boolean;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const V2Context = createContext<V2State | null>(null);

/** The v2 shell state. Outside the v2 shell it returns a safe Viewer default (every button locked). */
export function useV2(): V2State {
  return (
    useContext(V2Context) ?? {
      role: 'viewer',
      env: 'staging',
      hideTest: false,
      drawer: false,
      setDrawer: () => undefined,
      collapsed: false,
      toggleCollapsed: () => undefined,
    }
  );
}

const COLLAPSE_KEY = 'td-v2-side-collapsed';

export function V2Frame({ role, env, hideTest, children }: { role: StaffRole; env: AppEnvironment; hideTest: boolean; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Remembered per browser only; a convenience, so any storage failure is ignored.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
    } catch {
      /* private window or blocked storage */
    }
  }, []);
  // Close the phone drawer after moving to another page.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  }, []);

  const value = useMemo(() => ({ role, env, hideTest, drawer, setDrawer, collapsed, toggleCollapsed }), [role, env, hideTest, drawer, collapsed, toggleCollapsed]);
  return (
    <V2Context.Provider value={value}>
      <div className={`v2-shell${collapsed ? ' collapsed' : ''}${drawer ? ' drawer' : ''}`}>
        {children}
        <button type="button" className="v2-drawer-scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setDrawer(false)} />
      </div>
    </V2Context.Provider>
  );
}

/** Writes a non-secret preference cookie (theme, hide test data) for a year. */
export function setPrefCookie(name: 'td_theme' | 'td_hide_test', value: string) {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax${secure}`;
}
