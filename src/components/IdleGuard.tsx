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
 * tab sits untouched past the limit, it reloads, so the sign-in page replaces
 * money screens instead of leaving them on display.
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
    const timer = window.setInterval(() => {
      if (Date.now() - lastInput > idleMs + 60_000) window.location.assign('/');
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
