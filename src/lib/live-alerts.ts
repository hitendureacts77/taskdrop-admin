// Explicit .ts so node --test can run this file directly (npm test).
import { describeLive } from './live-describe.ts';
import type { LiveEvent } from './live-types.ts';
import { staffCan, type StaffArea, type StaffRole } from './staff-roles.ts';

/**
 * Which live events deserve a sound and a desktop notification, and for whom.
 *
 * Only things a person has to act on: a withdrawal asked for, a payout that
 * failed, a dispute opened, a help request, a copyright notice. Quotes, new
 * jobs, reviews and sign-ups stay in the feed without making a noise.
 *
 * Each staff role only hears about what it can act on (staff-roles.ts): finance
 * the money ones, support the people ones, admins everything, viewers nothing.
 * Whether alerts are on at all is the staff member's own choice (the "Alerts"
 * button) and their `notify` setting on the team page.
 */

export type LiveAlert = {
  title: string;
  body: string;
  href: string | null;
  /** Something is broken or time-critical, not just waiting. */
  urgent: boolean;
  area: StaffArea;
  /** Stops two notifications for the same thing stacking up. */
  tag: string;
};

export function alertFor(e: LiveEvent, role: StaffRole): LiveAlert | null {
  const s = e.summary ?? {};
  const line = describeLive(e);
  let base: Pick<LiveAlert, 'title' | 'urgent' | 'area'> | null = null;

  switch (e.kind) {
    case 'withdrawal_requested':
      base = { title: 'Withdrawal requested', urgent: false, area: 'money' };
      break;
    case 'payout_status':
      if (s.to === 'failed') base = { title: 'A payout failed', urgent: true, area: 'money' };
      break;
    case 'task_status':
      if (s.to === 'DISPUTED') base = { title: 'Dispute opened', urgent: true, area: 'money' };
      break;
    case 'help_request':
      base = { title: 'New help request', urgent: false, area: 'people' };
      break;
    case 'copyright_notice':
      base = { title: 'Copyright notice received', urgent: true, area: 'people' };
      break;
  }

  if (!base || !staffCan(role, base.area)) return null;
  return { ...base, body: line.text, href: line.href, tag: `td-${e.kind}-${e.record_id ?? e.id}` };
}
