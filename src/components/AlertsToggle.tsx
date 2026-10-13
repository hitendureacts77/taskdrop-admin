'use client';

import Link from 'next/link';
import { Icon } from './Icon';
import { useLive } from './LiveProvider';

/**
 * The "Alerts" button in the top bar: a chime and a desktop notification when a
 * withdrawal, a failed payout, a dispute, a help request or a copyright notice
 * arrives that this person can act on. Their own choice, remembered in this
 * browser; their team setting can switch alerts off for them.
 */
export function AlertsToggle() {
  const live = useLive();
  if (!live || live.status === 'unavailable') return null;
  const a = live.alerts;
  if (!a.supported) return null;

  if (!a.allowed) {
    return (
      <Link href="/settings/team" className="chip alerts-chip" title="Alerts are switched off for you on the team page. Open it to turn them back on.">
        <Icon name="bolt" size={14} /> Alerts off
      </Link>
    );
  }

  const soundOnly = a.enabled && a.permission === 'denied';
  const title = a.enabled
    ? soundOnly
      ? 'You hear a chime for things that need you. Desktop notifications are blocked in this browser; allow them in the site settings to get them too.'
      : 'You hear a chime, and see a desktop notification when this tab is in the background, for things that need you. Click to turn off.'
    : 'Get a chime and a desktop notification when something needs you. Click to turn on.';

  return (
    <button type="button" className={`chip alerts-chip${a.enabled ? ' on' : ''}`} aria-pressed={a.enabled} title={title} onClick={() => void a.setEnabled(!a.enabled)}>
      <Icon name="bolt" size={14} /> {a.enabled ? (soundOnly ? 'Alerts on · sound only' : 'Alerts on') : 'Turn on alerts'}
    </button>
  );
}
