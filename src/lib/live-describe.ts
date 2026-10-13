// Explicit .ts so node --test can run this file directly (npm test).
import { inr } from './format.ts';
import type { LiveEvent } from './live-types.ts';

/**
 * One live event as a sentence someone non-technical can act on, with where
 * to go for it. Names and amounts come from the event; anything missing reads
 * naturally ("Someone", "a job") rather than showing blanks.
 */

export type LiveTone = 'green' | 'blue' | 'gold' | 'red' | 'grey';

export type LiveLine = {
  icon: string;
  text: string;
  href: string | null;
  tone: LiveTone;
  /** Filter group in the feed. */
  group: LiveGroup;
};

export type LiveGroup = 'people' | 'tasks' | 'money' | 'help';

export const LIVE_GROUPS: { value: LiveGroup; label: string }[] = [
  { value: 'tasks', label: 'Jobs' },
  { value: 'money', label: 'Money' },
  { value: 'people', label: 'People' },
  { value: 'help', label: 'Help & safety' },
];

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function job(s: Record<string, unknown>): string {
  const t = str(s.title);
  return t ? `“${t}”` : 'a job';
}

function amount(s: Record<string, unknown>, prefix = ' · '): string {
  const n = num(s.amount_minor);
  return n === null ? '' : `${prefix}${inr(n)}`;
}

const TASK_STATUS: Record<string, { text: (j: string) => string; icon: string; tone: LiveTone }> = {
  OPEN: { text: (j) => `${j} is open for quotes again`, icon: 'jobs', tone: 'blue' },
  LOCKED: { text: (j) => `A worker was chosen for ${j}`, icon: 'check', tone: 'green' },
  TASK_STARTED: { text: (j) => `Work started on ${j}`, icon: 'bolt', tone: 'blue' },
  OVERDUE: { text: (j) => `${j} is overdue`, icon: 'clock', tone: 'gold' },
  WORK_DONE: { text: (j) => `Work on ${j} is done, waiting for the poster’s OK`, icon: 'clock', tone: 'blue' },
  REVISION_REQUESTED: { text: (j) => `The poster asked for changes on ${j}`, icon: 'refresh', tone: 'gold' },
  COMPLETED: { text: (j) => `The poster approved ${j}`, icon: 'check', tone: 'green' },
  AUTO_COMPLETED: { text: (j) => `${j} was approved automatically`, icon: 'check', tone: 'green' },
  CANCELLED: { text: (j) => `${j} was cancelled`, icon: 'undo', tone: 'grey' },
  DISPUTED: { text: (j) => `A dispute was opened on ${j}`, icon: 'scale', tone: 'red' },
};

const PAYOUT_STATUS: Record<string, { text: (who: string, amt: string) => string; icon: string; tone: LiveTone }> = {
  processing: { text: (w, a) => `Sending ${a} to ${w}`, icon: 'send', tone: 'blue' },
  paid: { text: (w, a) => `${a} paid to ${w}`, icon: 'check', tone: 'green' },
  failed: { text: (w, a) => `Payout of ${a} to ${w} failed`, icon: 'alert', tone: 'red' },
  cancelled: { text: (w, a) => `Withdrawal of ${a} by ${w} was cancelled`, icon: 'undo', tone: 'grey' },
  requested: { text: (w, a) => `Withdrawal of ${a} by ${w} is waiting again`, icon: 'clock', tone: 'gold' },
};

export function describeLive(e: LiveEvent): LiveLine {
  const s = e.summary ?? {};
  const who = str(s.who) ?? 'Someone';
  const id = e.record_id;

  switch (e.kind) {
    case 'signup':
      return { icon: 'people', text: `${who} joined TaskDrop`, href: id ? `/users/${id}` : null, tone: 'blue', group: 'people' };
    case 'task_posted': {
      const where = str(s.kind) === 'remote' ? ' (remote)' : '';
      return { icon: 'jobs', text: `${who} posted ${job(s)}${where}${amount(s)}`, href: id ? `/tasks/${id}` : null, tone: 'blue', group: 'tasks' };
    }
    case 'quote': {
      const n = num(s.amount_minor);
      const price = n === null ? 'a quote' : inr(n);
      return {
        icon: 'megaphone',
        text: s.first === true ? `First quote on ${job(s)}: ${price} from ${who}` : `${who} quoted ${price} on ${job(s)}`,
        href: id ? `/tasks/${id}` : null,
        tone: s.first === true ? 'green' : 'grey',
        group: 'tasks',
      };
    }
    case 'task_status': {
      const to = str(s.to) ?? '';
      const m = TASK_STATUS[to];
      return {
        icon: m?.icon ?? 'jobs',
        text: m ? m.text(job(s)) : `${job(s)} changed to ${to.toLowerCase().replace(/_/g, ' ')}`,
        href: id ? `/tasks/${id}` : null,
        tone: m?.tone ?? 'grey',
        group: 'tasks',
      };
    }
    case 'withdrawal_requested':
      return { icon: 'wallet', text: `${who} asked to withdraw${amount(s, ' ')}`, href: id ? `/payouts/${id}` : '/payouts', tone: 'gold', group: 'money' };
    case 'payout_status': {
      const n = num(s.amount_minor);
      const amt = n === null ? 'money' : inr(n);
      const m = PAYOUT_STATUS[str(s.to) ?? ''];
      return {
        icon: m?.icon ?? 'send',
        text: m ? m.text(who, amt) : `Payout to ${who} is now ${str(s.to) ?? 'updated'}`,
        href: id ? `/payouts/${id}` : '/payouts',
        tone: m?.tone ?? 'grey',
        group: 'money',
      };
    }
    case 'wallet_adjustment': {
      const n = num(s.amount_minor) ?? 0;
      const reason = str(s.reason);
      return {
        icon: 'bank',
        text: `${n >= 0 ? 'Added' : 'Took'} ${inr(Math.abs(n))} ${n >= 0 ? 'to' : 'from'} ${who}’s wallet${reason ? `: ${reason}` : ''}`,
        href: id ? `/users/${id}` : null,
        tone: 'gold',
        group: 'money',
      };
    }
    case 'help_request': {
      const subject = str(s.subject);
      return { icon: 'help', text: `${who} asked for help${subject ? `: “${subject}”` : ''}`, href: id ? `/support/${id}` : '/support', tone: 'gold', group: 'help' };
    }
    case 'proof':
      return { icon: 'check', text: `${who} sent proof of work for ${job(s)}`, href: id ? `/tasks/${id}` : null, tone: 'blue', group: 'tasks' };
    case 'review': {
      const r = num(s.rating);
      const about = str(s.about) ?? 'someone';
      return {
        icon: 'star',
        text: `${who} rated ${about}${r === null ? '' : ` ${r} star${r === 1 ? '' : 's'}`}`,
        href: id ? `/tasks/${id}` : null,
        tone: r !== null && r <= 2 ? 'gold' : 'grey',
        group: 'people',
      };
    }
    case 'copyright_notice': {
      const work = str(s.work);
      return { icon: 'alert', text: `Copyright notice received${work ? ` about “${work}”` : ''}`, href: '/copyright', tone: 'red', group: 'help' };
    }
    default:
      return { icon: 'bolt', text: e.kind.replace(/_/g, ' '), href: null, tone: 'grey', group: 'tasks' };
  }
}
