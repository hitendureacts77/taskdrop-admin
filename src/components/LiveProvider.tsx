'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { alertFor, type LiveAlert } from '@/lib/live-alerts';
import type { LiveCounters, LiveEvent, LiveNav, LiveSnapshot } from '@/lib/live-types';
import { needsSummary, rankNeeds, type NeedsItem, type RankedNeed } from '@/lib/needs-you';
import { liveEventIsMoney, staffCanSee, type StaffRole } from '@/lib/staff-roles';
import { createClient } from '@/lib/supabase/browser';

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
 *
 * It also holds "Needs you now" (ranked against this browser's clock, so the
 * deadlines tick without a re-read) and the alerts: a chime and a desktop
 * notification when something arrives that this person can act on. Alerts are
 * the person's own choice (the Alerts button), kept in this browser only, and
 * switched off for good by their `notify` setting on the team page.
 */

export type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'unavailable';

export type AlertsState = {
  /** This browser can show notifications / play sound. */
  supported: boolean;
  /** Notification permission: 'unsupported' when the browser has none. */
  permission: NotificationPermission | 'unsupported';
  /** The person has switched alerts on in this browser. */
  enabled: boolean;
  /** False when their team setting turns alerts off for them. */
  allowed: boolean;
  setEnabled: (on: boolean) => Promise<void>;
};

type LiveState = {
  status: LiveStatus;
  counters: LiveCounters | null;
  nav: LiveNav | null;
  events: LiveEvent[];
  /** Waiting on a person, most urgent first. Null until the first read. */
  needs: RankedNeed[] | null;
  needsSummary: { total: number; late: number; soon: number };
  /** The signed-in person's staff role, for hiding what that role may not see. */
  role: StaffRole;
  /** False until the first snapshot arrives. */
  loaded: boolean;
  paused: boolean;
  setPaused: (on: boolean) => void;
  /** Feed events that arrived while paused. */
  held: number;
  alerts: AlertsState;
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
/** Re-rank the queue against the clock this often. */
const TICK_MS = 30_000;
const KEEP = 100;
const ALERTS_KEY = 'td_admin_alerts';

function merge(current: LiveEvent[], incoming: LiveEvent[]): LiveEvent[] {
  if (!incoming.length) return current;
  const byId = new Map(current.map((e) => [e.id, e]));
  for (const e of incoming) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => b.id - a.id).slice(0, KEEP);
}

type AudioCtor = typeof AudioContext;
const audioCtor = (): AudioCtor | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext ?? null;
};

/** A short two-tone chime (three tones when it's urgent). No sound file needed. */
function chime(ctx: AudioContext, urgent: boolean) {
  if (ctx.state === 'suspended') void ctx.resume();
  const t0 = ctx.currentTime;
  (urgent ? [880, 660, 880] : [740, 990]).forEach((hz, i) => {
    const start = t0 + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.17);
  });
}

export function LiveProvider({
  initialNav,
  alertRole,
  alertsAllowed,
  children,
}: {
  initialNav: LiveNav;
  alertRole: StaffRole;
  alertsAllowed: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [counters, setCounters] = useState<LiveCounters | null>(null);
  const [nav, setNav] = useState<LiveNav | null>(initialNav);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [held, setHeld] = useState<LiveEvent[]>([]);
  const [paused, setPausedState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rawNeeds, setRawNeeds] = useState<NeedsItem[] | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [alertsOn, setAlertsOn] = useState(false);
  // Set after mount: the server can't know what this browser supports.
  const [supported, setSupported] = useState(false);

  const pausedRef = useRef(false);
  const lastInput = useRef(Date.now());
  const lastRefresh = useRef(0);
  const settleTimer = useRef<number | null>(null);
  const inFlight = useRef(false);
  const again = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const alertedIds = useRef<Set<number>>(new Set());
  // The channel callback is created once; it reads the latest values from here.
  const live = useRef({ alertsOn: false, allowed: alertsAllowed, role: alertRole });
  live.current = { alertsOn, allowed: alertsAllowed, role: alertRole };

  const ranked = useMemo(() => (rawNeeds ? rankNeeds(rawNeeds, nowMs) : null), [rawNeeds, nowMs]);
  const summary = useMemo(() => (ranked ? needsSummary(ranked) : { total: 0, late: 0, soon: 0 }), [ranked]);

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
      // A failed read leaves the last queue on screen rather than showing "all clear".
      if (snap.needs) setRawNeeds(snap.needs);
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

  /** Chime, and a desktop notification when the tab isn't in front. */
  const raise = useCallback(
    (a: LiveAlert) => {
      if (audio.current) chime(audio.current, a.urgent);
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
      try {
        const n = new Notification(a.title, { body: a.body, tag: a.tag, requireInteraction: a.urgent });
        n.onclick = () => {
          window.focus();
          if (a.href) router.push(a.href);
          n.close();
        };
      } catch {
        // Some browsers refuse constructed notifications; the chime already played.
      }
    },
    [router],
  );

  const onEvent = useCallback(
    (e: LiveEvent) => {
      // Every staff browser hears every broadcast; a role that cannot see money drops those here.
      if (!staffCanSee(live.current.role, 'money') && liveEventIsMoney(e.kind, e.summary)) return;
      if (pausedRef.current) setHeld((h) => merge(h, [e]));
      else setEvents((cur) => merge(cur, [e]));

      const l = live.current;
      if (l.alertsOn && l.allowed && !alertedIds.current.has(e.id)) {
        alertedIds.current.add(e.id);
        if (alertedIds.current.size > 200) alertedIds.current = new Set([...alertedIds.current].slice(-100));
        const a = alertFor(e, l.role);
        if (a) raise(a);
      }

      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        settleTimer.current = null;
        void resync();
        maybeRefreshPage();
      }, SETTLE_MS);
    },
    [resync, maybeRefreshPage, raise],
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

  const ensureAudio = useCallback(() => {
    if (audio.current) {
      if (audio.current.state === 'suspended') void audio.current.resume();
      return;
    }
    const Ctor = audioCtor();
    if (Ctor) audio.current = new Ctor();
  }, []);

  /** The Alerts button. Switching on needs a click: browsers only allow sound and the permission prompt after one. */
  const setEnabled = useCallback(
    async (on: boolean) => {
      if (on) {
        ensureAudio();
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          try {
            setPermission(await Notification.requestPermission());
          } catch {
            // Older browsers use a callback form; leave the permission as it was.
          }
        }
        // A short confirmation chime so the person knows it works.
        if (audio.current) chime(audio.current, false);
      }
      setAlertsOn(on);
      try {
        window.localStorage.setItem(ALERTS_KEY, on ? '1' : '0');
      } catch {
        // Private windows can refuse storage; the choice then lasts until reload.
      }
    },
    [ensureAudio],
  );

  // What this browser can do, and what the person chose last time.
  useEffect(() => {
    setSupported(audioCtor() !== null || typeof Notification !== 'undefined');
    try {
      if (typeof Notification !== 'undefined') setPermission(Notification.permission);
      setAlertsOn(window.localStorage.getItem(ALERTS_KEY) === '1');
    } catch {
      // No storage: alerts start off.
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
      // After a reload, sound can only start once the person has touched the page.
      if (live.current.alertsOn && live.current.allowed) ensureAudio();
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
  }, [resync, ensureAudio]);

  // Deadlines tick without a re-read.
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => window.clearInterval(t);
  }, []);

  // The overdue count in the tab title, so a background tab still shows it.
  const late = summary.late;
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\)\s+/, '');
      const next = late > 0 ? `(${late}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    // Navigating can reset the title after this runs; re-apply shortly after.
    const t = window.setTimeout(apply, 600);
    return () => window.clearTimeout(t);
  }, [late, pathname]);

  const alerts = useMemo<AlertsState>(
    () => ({
      supported,
      permission,
      enabled: alertsOn && alertsAllowed,
      allowed: alertsAllowed,
      setEnabled,
    }),
    [supported, permission, alertsOn, alertsAllowed, setEnabled],
  );

  const value = useMemo<LiveState>(
    () => ({ status, counters, nav, events, needs: ranked, needsSummary: summary, role: alertRole, loaded, paused, setPaused, held: held.length, alerts }),
    [status, counters, nav, events, ranked, summary, alertRole, loaded, paused, setPaused, held.length, alerts],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
