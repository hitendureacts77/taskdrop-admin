/**
 * The daily digest is written by the background job as "1 new people", "1 jobs posted" and so on.
 * The job lives in the user repo, so the admin fixes the count words when it shows the line: a lone "1"
 * gets the singular. Anything else is left exactly as written. Pure, so it can be tested.
 */
const SINGULAR: [RegExp, string][] = [
  [/(^|[^\d.,])1 new people\b/g, '$11 new person'],
  [/(^|[^\d.,])1 jobs\b/g, '$11 job'],
  [/(^|[^\d.,])1 withdrawals\b/g, '$11 withdrawal'],
  [/(^|[^\d.,])1 open disputes\b/g, '$11 open dispute'],
  [/(^|[^\d.,])1 open help requests\b/g, '$11 open help request'],
];

export function singularDigest(body: string): string {
  return SINGULAR.reduce((s, [re, to]) => s.replace(re, to), body);
}

/** The heading over the alert list: it says how many are shown out of how many unread, so it agrees with the tab. */
export function alertsHeading(shown: number, unread: number, view: 'unread' | 'all', cap: number): { title: string; sub: string } {
  const noun = (n: number) => `alert${n === 1 ? '' : 's'}`;
  if (view === 'unread') {
    if (unread > shown) return { title: `Showing the latest ${shown} of ${unread} unread`, sub: 'Newest first. Mark these as read to see the older ones.' };
    return { title: `${shown} unread ${noun(shown)}`, sub: 'Newest first.' };
  }
  if (shown >= cap) return { title: `Showing the latest ${shown} ${noun(shown)}`, sub: `Newest first. Only the latest ${cap} are listed${unread ? `; ${unread} unread in all` : ''}.` };
  return { title: `${shown} ${noun(shown)}`, sub: 'Newest first.' };
}
