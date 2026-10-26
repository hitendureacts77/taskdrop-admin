'use client';

import { useEffect } from 'react';

/** Tell the server about activity at most this often. */
const PING_MS = 4 * 60_000;

/**
 * The browser half of the admin idle timeout (the rule itself is in
 * middleware.ts).
 *
 * Reading a long page or filling in a form makes no requests, so the server
 * would see that as idle. While there is mouse, keyboard or scroll activity,
 * this pings /api/auth/ping every few minutes so the server knows. And when a
 * tab sits untouched past the limit, it asks the server whether the session
 * has expired and, if so, opens the sign-in page, so money screens are not
 * left on display.
 *
 * That question is marked as background, so it never counts as activity
 * itself. P2-43: it used to be a page reload, which the server counted, so two
 * idle tabs opened a few minutes apart kept restarting each other's clock and
 * the session never ended.
 */
export function IdleGuard({ idleMinutes }: { idleMinutes: number }) {
  useEffect(() => {
    const idleMs = idleMinutes * 60_000;
    let lastInput = Date.now();
    let lastPing = Date.now();

    const ping = async () => {
      lastPing = Date.now();
      try {
        const res = await fetch('/api/auth/ping', { cache: 'no-store' });
        if (res.status === 401) window.location.assign('/login');
      } catch {
        // Offline: the next request after reconnecting is checked by the server anyway.
      }
    };

    const onInput = () => {
      lastInput = Date.now();
      if (lastInput - lastPing > PING_MS) void ping();
    };

    // A minute past the limit, so the server is sure to agree it has expired.
    // If it hasn't (someone is working in another tab), this tab stays open
    // and asks again on the next tick.
    const check = async () => {
      try {
        const res = await fetch('/api/auth/ping', { cache: 'no-store', headers: { 'x-td-background': '1' } });
        if (res.status !== 401) return;
        // The middleware says why ("signed out after 30 minutes without activity"); the login page shows it.
        const why = (await res.json().catch(() => null)) as { message?: string } | null;
        window.location.assign(why?.message ? `/login?error=${encodeURIComponent(why.message)}` : '/login');
      } catch {
        // Offline: the next request after reconnecting is checked by the server anyway.
      }
    };

    const timer = window.setInterval(() => {
      if (Date.now() - lastInput > idleMs + 60_000) void check();
    }, 30_000);

    const events = ['pointerdown', 'keydown', 'scroll', 'mousemove', 'touchstart'] as const;
    for (const e of events) window.addEventListener(e, onInput, { passive: true });
    return () => {
      window.clearInterval(timer);
      for (const e of events) window.removeEventListener(e, onInput);
    };
  }, [idleMinutes]);

  return null;
}
