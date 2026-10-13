'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/browser';
import type { LiveCounters, LiveEvent, LiveNav, LiveSnapshot } from '@/lib/live-types';

/**
 * The panel's one live connection (migration 091 in the TaskDrop app repo).
 *
 * - Listens on the private Realtime channel 'admin:live'. Only staff may join
 *   it; the database checks.
 * - A broadcast only says "something happened". Numbers are re-read from the
 *   server (/api/live) a moment later, so they are always the server's, never
 *   guessed in the browser. Money screens re-read their own amounts.
 * - Re-reads every minute, when the tab comes back, and after reconnecting, so
 *   a missed broadcast can't leave a wrong number for long.
 * - Server-rendered pages (money tiles, lists) refresh only while someone is
 *   actually using the panel. Background re-reads carry x-td-background so
 *   the idle sign-out still happens when nobody is there.
 */

export type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'unavailable';

type LiveState = {
  status: LiveStatus;
  counters: LiveCounters | null;
  nav: LiveNav | null;
  events: LiveEvent[];
  /** False until the first snapshot arrives. */
  loaded: boolean;
  /** Feed events that arrived while paused. */
  paused: boolean;
  setPaused: (on: boolean) => void;
  held: number;
};

const LiveContext = createContext<LiveState | null>(null);

export function useLive(): LiveState | null {
  return useContext(LiveContext);
}

const RESYNC_MS = 60_000;
/** Wait this long after an event before re-reading, so a burst costs one read. */
const SETTLE_MS = 1_200;
/** Refresh server-rendered pages at most this often. */
const REFRESH_MS = 8_000;
/** Someone who touched the panel this recently is "using it". */
const ACTIVE_MS = 2 * 60_000;
const KEEP = 100;

function merge(current: LiveEvent[], incoming: LiveEvent[]): LiveEvent[] {
  if (!incoming.length) return current;
  const byId = new Map(current.map((e) => [e.id, e]));
  for (const e of incoming) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => b.id - a.id).slice(0, KEEP);
}

export function LiveProvider({ initialNav, children }: { initialNav: LiveNav; children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [counters, setCounters] = useState<LiveCounters | null>(null);
  const [nav, setNav] = useState<LiveNav | null>(initialNav);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [held, setHeld] = useState<LiveEvent[]>([]);
  const [paused, setPausedState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const pausedRef = useRef(false);
  const lastInput = useRef(Date.now());
  const lastRefresh = useRef(0);
  const settleTimer = useRef<number | null>(null);
  const inFlight = useRef(false);
  const again = useRef(false);

  const resync = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const res = await fetch('/api/live', { cache: 'no-store', headers: { 'x-td-background': '1' } });
      if (res.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (!res.ok) return;
      const snap = (await res.json()) as LiveSnapshot;
      if (snap.counters) setCounters(snap.counters);
      if (snap.nav) setNav(snap.nav);
      if (snap.events) {
        const list = snap.events;
        if (pausedRef.current) setHeld((h) => merge(h, list));
        else setEvents((cur) => merge(cur, list));
      }
      // No counters and no events: migration 091 isn't applied yet.
      if (!snap.counters && !snap.events) setStatus('unavailable');
      setLoaded(true);
    } catch {
      // Offline: the next tick or reconnect tries again.
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void resync();
      }
    }
  }, []);

  const maybeRefreshPage = useCallback(() => {
    const now = Date.now();
    if (document.visibilityState !== 'visible') return;
    if (now - lastInput.current > ACTIVE_MS) return;
    if (now - lastRefresh.current < REFRESH_MS) return;
    lastRefresh.current = now;
    router.refresh();
  }, [router]);

  const onEvent = useCallback(
    (e: LiveEvent) => {
      if (pausedRef.current) setHeld((h) => merge(h, [e]));
      else setEvents((cur) => merge(cur, [e]));
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        settleTimer.current = null;
        void resync();
        maybeRefreshPage();
      }, SETTLE_MS);
    },
    [resync, maybeRefreshPage],
  );

  const setPaused = useCallback((on: boolean) => {
    pausedRef.current = on;
    setPausedState(on);
    if (!on) {
      setHeld((h) => {
        if (h.length) setEvents((cur) => merge(cur, h));
        return [];
      });
    }
  }, []);

  // The channel.
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let wasLive = false;

    (async () => {
      // Private channels authorise with the signed-in token.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel('admin:live', { config: { private: true } })
        .on('broadcast', { event: 'event' }, ({ payload }) => onEvent(payload as LiveEvent))
        .subscribe((s) => {
          if (s === 'SUBSCRIBED') {
            setStatus((cur) => (cur === 'unavailable' ? cur : 'live'));
            // Catch up on anything missed while disconnected.
            if (wasLive) void resync();
            wasLive = true;
          } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
            setStatus((cur) => (cur === 'unavailable' ? cur : 'reconnecting'));
          }
        });
    })().catch(() => setStatus('reconnecting'));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) void supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, onEvent, resync]);

  // First read, the minute tick, and coming back to the tab.
  useEffect(() => {
    void resync();
    const tick = window.setInterval(() => void resync(), RESYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void resync();
    };
    const onInput = () => {
      lastInput.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    for (const ev of ['pointerdown', 'keydown', 'scroll'] as const) window.addEventListener(ev, onInput, { passive: true });
    return () => {
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      for (const ev of ['pointerdown', 'keydown', 'scroll'] as const) window.removeEventListener(ev, onInput);
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
    };
  }, [resync]);

  const value = useMemo<LiveState>(
    () => ({ status, counters, nav, events, loaded, paused, setPaused, held: held.length }),
    [status, counters, nav, events, loaded, paused, setPaused, held.length],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
