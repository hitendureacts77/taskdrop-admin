'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLive } from '@/components/LiveProvider';
import { timeAgo } from '@/lib/format';
import { describeLive, LIVE_GROUPS, type LiveGroup } from '@/lib/live-describe';
import type { LiveEvent } from '@/lib/live-types';
import { staffCanSee } from '@/lib/staff-roles';
import { isTestTitle, isTestUserId } from '@/lib/test-data';
import { useV2 } from '../V2Frame';
import * as v2 from '../ui';

/**
 * Admin v2 live feed: plain sentences, newest first, each opening what it is
 * about. Filters (Money only for roles that see money), Pause / Resume with the
 * held count, and "Hide test data" leaves out fake seed people and [e2e] jobs.
 */

const str = (v: unknown) => (typeof v === 'string' ? v : null);

/** A live event is test data when its actor, its person or its job title says so. */
function isTestEvent(e: LiveEvent): boolean {
  const s = e.summary ?? {};
  return (
    isTestUserId(e.actor_id) ||
    (e.record_type === 'user' && isTestUserId(e.record_id)) ||
    isTestTitle(str(s.title))
  );
}

export function V2LiveFeed({ limit = 25 }: { limit?: number }) {
  const live = useLive();
  const { hideTest } = useV2();
  const [group, setGroup] = useState<LiveGroup | 'all'>('all');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (!live) return null;
  if (live.status === 'unavailable') {
    return (
      <v2.Card title="Live feed">
        <v2.SetupNotice what="The live feed of what happens in the app." detail="admin_live_events" />
      </v2.Card>
    );
  }

  const groups = [{ value: 'all' as const, label: 'Everything' }, ...LIVE_GROUPS.filter((g) => g.value !== 'money' || staffCanSee(live.role, 'money'))];
  const lines = live.events
    .map((e) => ({ e, l: describeLive(e), test: isTestEvent(e) }))
    .filter(({ test }) => !hideTest || !test)
    .filter(({ l }) => group === 'all' || l.group === group)
    .slice(0, limit);

  return (
    <v2.Card
      title="Live feed"
      sub="Everything happening in the app, newest first. Each line opens what it is about."
      right={
        <button type="button" className="v2-btn sm" onClick={() => live.setPaused(!live.paused)} aria-pressed={live.paused}>
          {live.paused ? `Resume${live.held ? ` (${live.held} new)` : ''}` : 'Pause'}
        </button>
      }
    >
      <div className="v2-chips" role="group" aria-label="Show">
        {groups.map((g) => (
          <button key={g.value} type="button" className="v2-chip" aria-pressed={group === g.value} onClick={() => setGroup(g.value)}>
            {g.label}
          </button>
        ))}
      </div>
      {!live.loaded ? (
        <v2.Loading lines={5} label="Loading the live feed" />
      ) : lines.length ? (
        <ul className="wp4-feed" aria-live="polite" aria-relevant="additions">
          {lines.map(({ e, l, test }) => {
            const body = (
              <>
                <span className={`dt ${l.group}`} aria-hidden="true" />
                <span className="tx">
                  {l.text} <v2.TestTag show={test} />
                </span>
                <time className="tm" dateTime={e.created_at} title={new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>
                  {timeAgo(e.created_at, now)}
                </time>
              </>
            );
            return (
              <li key={e.id}>
                {l.href ? (
                  <Link href={l.href} className="f">
                    {body}
                  </Link>
                ) : (
                  <span className="f">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <v2.Empty title={group === 'all' ? 'Quiet for now' : 'Nothing of this kind yet'} icon="check">
          New sign-ups, jobs, quotes, payouts and help requests show up here the moment they happen.
        </v2.Empty>
      )}
    </v2.Card>
  );
}
