'use client';

import { useEffect, useRef, useState } from 'react';
import { useLive } from '@/components/LiveProvider';
import { staffCanSee } from '@/lib/staff-roles';
import * as v2 from '../ui';

/**
 * Admin v2 "Right now": the live counts (admin_live_counters through
 * LiveProvider), each tile opening the list behind it. Numbers flash when they
 * change. Sales never sees open disputes (the snapshot zeroes it too).
 */

const fmt = (n: number) => n.toLocaleString('en-IN');

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
  return <span className={on ? 'wp4-flash' : undefined}>{fmt(value)}</span>;
}

export function V2RightNow() {
  const live = useLive();
  if (!live) return null;

  const head = (
    <h2 className="v2-sec-t">
      Right now <v2.Pill tone="ok">updates by itself</v2.Pill>
    </h2>
  );

  if (live.status === 'unavailable') {
    return (
      <section aria-label="Right now">
        {head}
        <v2.SetupNotice what="The live numbers (Right now and the live feed)." detail="admin_live_counters" />
      </section>
    );
  }

  const c = live.counters;
  if (!c) {
    return (
      <section aria-label="Right now" aria-busy="true">
        {head}
        <v2.Grid cols={4} className="wp4-keep2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="v2-tile sm" aria-hidden="true">
              <div className="v2-sk" />
              <div className="v2-sk" style={{ width: '50%' }} />
            </div>
          ))}
        </v2.Grid>
      </section>
    );
  }

  const tiles = [
    { label: 'Online now', v: c.online_now, foot: `${fmt(c.online_workers)} of them can work`, href: '/users?filter=online' },
    { label: 'Getting quotes', v: c.open_tasks, foot: `${fmt(c.quotes_last_hour)} quote${c.quotes_last_hour === 1 ? '' : 's'} in the last hour`, href: '/tasks?filter=open' },
    { label: 'Hired & in progress', v: c.in_progress, foot: 'being worked on now', href: '/tasks?filter=active' },
    { label: 'Overdue', v: c.overdue, foot: c.overdue ? 'past their due time' : 'nothing late', href: '/tasks?filter=overdue', tone: c.overdue ? ('orange' as const) : undefined },
    { label: 'Waiting for poster’s OK', v: c.waiting_approval, foot: 'released by itself after the review days', href: '/tasks?filter=waiting' },
    ...(staffCanSee(live.role, 'money')
      ? [{ label: 'Open disputes', v: c.disputes_open, foot: c.disputes_open ? 'money frozen until you decide' : 'none', href: '/disputes', tone: c.disputes_open ? ('orange' as const) : undefined }]
      : []),
    { label: 'Help requests waiting', v: c.help_waiting, foot: c.help_waiting ? 'waiting for a reply' : 'nobody waiting', href: '/support' },
    { label: 'Posted today', v: c.tasks_today, foot: `+ ${fmt(c.signups_today)} new ${c.signups_today === 1 ? 'person' : 'people'} today`, href: '/tasks?filter=posted_today' },
  ];

  return (
    <section aria-label="Right now">
      {head}
      <v2.Grid cols={4} className="wp4-keep2">
        {tiles.map((t) => (
          <v2.Tile key={t.label} small label={t.label} value={<Flash value={t.v} />} foot={t.foot} href={t.href} tone={t.tone} />
        ))}
      </v2.Grid>
    </section>
  );
}
