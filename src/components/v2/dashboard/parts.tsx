import Link from 'next/link';
import type { TodayCounts } from '@/lib/data';
import * as v2 from '../ui';

/** Shared bits of the v2 dashboard (admin and Sales). Server-safe. */

export function greeting(now: Date) {
  const h = Number(now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function longDate(now: Date) {
  return now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Owner decision 7: developer sign-in (dev_otp_for_all) on is a red launch
 * blocker. Not shown to Sales (the page never renders it for them).
 */
export function DevSignInBlocker({ on }: { on: boolean | null }) {
  if (!on) return null;
  return (
    <div className="wp4-mb">
      <v2.Blocker
        title="Launch blocker: developer sign-in is ON."
        action={
          <Link className="v2-btn sm" href="/settings/switches">
            Open App switches
          </Link>
        }
      >
        Anyone can sign in to any phone number’s account with an auto-filled code. Turn it off before real people use TaskDrop.
      </v2.Blocker>
    </div>
  );
}

const AVAILABLE_HINT =
  'Counts only people with the older “available now” setting switched on, which the app no longer asks for, so it is often 0. “Online now” counts everyone who used the app in the last 3 minutes.';

type Stat = { label: string; v: number; href: string; foot?: string; title?: string };

/** Today's counts as small tiles. Admin order starts with finished jobs; Sales ends with it. */
export function TodayStats({ today, order }: { today: TodayCounts; order: 'money' | 'sales' }) {
  const finished: Stat = { label: order === 'sales' ? 'Finished today' : 'Jobs finished today', v: today.jobsFinished, href: '/tasks?filter=finished_today' };
  const rest: Stat[] = [
    { label: 'Jobs posted today', v: today.jobsPosted, href: '/tasks?filter=posted_today' },
    { label: 'New people today', v: today.newPeople, href: '/users?filter=new_today' },
    { label: 'Workers available now', v: today.availableNow, href: '/users?filter=available', foot: 'older “available now” setting', title: AVAILABLE_HINT },
    { label: 'Waiting for poster’s OK', v: today.waitingApproval, href: '/tasks?filter=waiting' },
  ];
  const tiles = order === 'sales' ? [...rest, finished] : [finished, ...rest];
  return (
    <v2.Grid cols={5} className="wp4-keep2 wp4-mt">
      {tiles.map((t) => (
        <v2.Tile key={t.href} small href={t.href} label={t.title ? <span title={t.title}>{t.label}</span> : t.label} value={t.v.toLocaleString('en-IN')} foot={t.foot} />
      ))}
    </v2.Grid>
  );
}
