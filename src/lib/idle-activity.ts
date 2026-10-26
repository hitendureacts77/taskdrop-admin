/**
 * Which requests count as "a person is using the panel" for the admin idle
 * timeout (the rule itself is in src/middleware.ts).
 *
 * A background request must never restart the idle clock, or an unattended
 * panel stays signed in forever. P2-43: Next 16 sends `next-router-prefetch`
 * with the values 1, 2 or 3 depending on the prefetch kind (and the segment
 * cache adds `next-router-segment-prefetch`), but only the value 1 used to be
 * recognised, so some sidebar prefetches kept the session alive.
 */

type Header = (name: string) => string | null;

/** True for prefetches and for the live panel's own re-reads. */
export function isBackgroundRequest(header: Header): boolean {
  return (
    header('x-td-background') === '1' ||
    // Any value: 1 (loading boundary), 2 (runtime), 3 (shell) are all prefetches.
    Boolean(header('next-router-prefetch')) ||
    Boolean(header('next-router-segment-prefetch')) ||
    header('purpose') === 'prefetch' ||
    (header('sec-purpose') ?? '').includes('prefetch')
  );
}

/**
 * One line for the runtime log when a request restarts the idle clock, so the
 * next "why is this session still alive" can be answered from the log. Only
 * names and short header values: never cookies or tokens.
 */
export function describeActivity(method: string, path: string, header: Header, sinceLastSeenMs: number | null) {
  return {
    msg: 'admin idle clock restarted',
    method,
    path,
    sinceLastSeenSec: sinceLastSeenMs === null ? null : Math.round(sinceLastSeenMs / 1000),
    rsc: header('rsc') === '1',
    prefetch: header('next-router-prefetch'),
    segmentPrefetch: header('next-router-segment-prefetch') ? 'yes' : null,
    purpose: header('purpose') ?? header('sec-purpose'),
    fetchMode: header('sec-fetch-mode'),
    fetchDest: header('sec-fetch-dest'),
  };
}
