'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { describeLive, LIVE_GROUPS, type LiveGroup } from '@/lib/live-describe';
import { timeAgo } from '@/lib/format';
import { staffCanSee } from '@/lib/staff-roles';
import { Icon } from './Icon';
import { useLive } from './LiveProvider';
import { Card, Empty } from './ui';

/**
 * What's happening in the app, newest first, as plain sentences. Each line
 * opens the job, person, payout or help request it is about. Pausing holds
 * new lines back (they're counted) so a busy minute doesn't scroll away what
 * you're reading.
 */
export function LiveFeed({ limit = 25 }: { limit?: number }) {
  const live = useLive();
  const [group, setGroup] = useState<LiveGroup | 'all'>('all');
  // Re-render every 30 s so "2 min ago" stays true.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (!live || live.status === 'unavailable') return null;

  const lines = live.events
    .map((e) => ({ e, l: describeLive(e) }))
    .filter(({ l }) => group === 'all' || l.group === group)
    .slice(0, limit);

  return (
    <Card
      title="Live feed"
      sub="Everything happening in the app, as it happens."
      right={
        <button type="button" className="btn btn-small" onClick={() => live.setPaused(!live.paused)} aria-pressed={live.paused}>
          {live.paused ? `Resume${live.held ? ` · ${live.held} new` : ''}` : 'Pause'}
        </button>
      }
      flush
    >
      <div className="live-filters" role="group" aria-label="Show">
        {[{ value: 'all' as const, label: 'Everything' }, ...LIVE_GROUPS.filter((g) => g.value !== 'money' || staffCanSee(live.role, 'money'))].map((g) => (
          <button key={g.value} type="button" className={`live-filter${group === g.value ? ' on' : ''}`} aria-pressed={group === g.value} onClick={() => setGroup(g.value)}>
            {g.label}
          </button>
        ))}
      </div>
      {!live.loaded ? (
        <ul className="live-list" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="live-row skeleton-row" aria-hidden="true" />
          ))}
        </ul>
      ) : lines.length ? (
        <ul className="live-list" aria-live="polite" aria-relevant="additions">
          {lines.map(({ e, l }) => {
            const body = (
              <>
                <span className={`live-icon tone-${l.tone}`} aria-hidden="true">
                  <Icon name={l.icon} size={16} />
                </span>
                <span className="live-text">{l.text}</span>
                <time className="live-time" dateTime={e.created_at} title={new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>
                  {timeAgo(e.created_at, now)}
                </time>
              </>
            );
            return (
              <li key={e.id} className="live-row">
                {l.href ? (
                  <Link href={l.href} className="live-link">
                    {body}
                  </Link>
                ) : (
                  <span className="live-link">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title={group === 'all' ? 'Quiet for now' : 'Nothing of this kind yet'}>New sign-ups, jobs, quotes, payouts and help requests show up here the moment they happen.</Empty>
      )}
    </Card>
  );
}
