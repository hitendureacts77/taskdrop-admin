'use client';

import { useEffect, useRef, useState } from 'react';
import { StatLink } from './ui';
import { useLive } from './LiveProvider';

/**
 * The live strip on the Dashboard: what's happening right now, each number
 * opening the list behind it. Counts only; money stays in the tiles above,
 * which come from the money reads.
 */

const fmt = (n: number) => n.toLocaleString('en-IN');

/** Briefly highlights a number when it changes. */
function Flash({ value }: { value: number }) {
  const prev = useRef(value);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), 1600);
    return () => window.clearTimeout(t);
  }, [value]);
  return <span className={on ? 'live-flash' : undefined}>{fmt(value)}</span>;
}

export function LiveStrip() {
  const live = useLive();
  if (!live || live.status === 'unavailable') return null;
  const c = live.counters;

  if (!c) {
    return (
      <div className="stats live-strip" aria-busy="true" aria-label="Loading live numbers">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="stat skeleton-stat" aria-hidden="true" />
        ))}
      </div>
    );
  }

  return (
    <section className="live-strip-wrap" aria-label="Right now">
      <div className="live-strip-head">
        <h2>Right now</h2>
        <span className="muted">Updates by itself</span>
      </div>
      <div className="stats live-strip">
        <StatLink href="/users?filter=online" icon="people" label="Online now" value={<Flash value={c.online_now} />} sub={`${fmt(c.online_workers)} of them can work`} />
        <StatLink href="/tasks?filter=open" icon="jobs" label="Getting quotes" value={<Flash value={c.open_tasks} />} sub={`${fmt(c.quotes_last_hour)} quote${c.quotes_last_hour === 1 ? '' : 's'} in the last hour`} />
        <StatLink href="/tasks?filter=active" icon="bolt" label="Hired & in progress" value={<Flash value={c.in_progress} />} />
        <StatLink
          href="/tasks?filter=overdue"
          icon="clock"
          label="Overdue"
          value={<Flash value={c.overdue} />}
          sub={c.overdue ? 'Past their due time' : 'Nothing late'}
        />
        <StatLink href="/tasks?filter=waiting" icon="check" label="Waiting for poster’s OK" value={<Flash value={c.waiting_approval} />} />
        <StatLink href="/disputes" icon="scale" label="Open disputes" value={<Flash value={c.disputes_open} />} sub={c.disputes_open ? 'Money frozen until you decide' : 'None'} />
        <StatLink href="/support" icon="help" label="Help requests waiting" value={<Flash value={c.help_waiting} />} />
        <StatLink
          href="/tasks?filter=posted_today"
          icon="megaphone"
          label="Posted today"
          value={<Flash value={c.tasks_today} />}
          sub={`${fmt(c.signups_today)} new ${c.signups_today === 1 ? 'person' : 'people'} today`}
        />
      </div>
    </section>
  );
}
