/**
 * The live feed and counters (migration 091 in the TaskDrop app repo), shared
 * by the server reads in live.ts and the browser half in LiveProvider. No
 * server-only imports here.
 */

export type LiveEvent = {
  id: number;
  kind: string;
  record_type: string;
  record_id: string | null;
  actor_id: string | null;
  summary: Record<string, unknown>;
  created_at: string;
};

export type LiveCounters = {
  at: string;
  online_now: number;
  online_workers: number;
  open_tasks: number;
  in_progress: number;
  waiting_approval: number;
  overdue: number;
  disputes_open: number;
  quotes_last_hour: number;
  tasks_today: number;
  signups_today: number;
  help_waiting: number;
};

/** The sidebar's badges (same shape as data.ts NavCounts). */
export type LiveNav = { payouts: number; disputes: number; refunds: number; support: number };

/**
 * What /api/live returns. Each part is null when it could not be read, e.g.
 * counters and events before migration 091 is applied.
 */
export type LiveSnapshot = {
  counters: LiveCounters | null;
  events: LiveEvent[] | null;
  nav: LiveNav | null;
};
