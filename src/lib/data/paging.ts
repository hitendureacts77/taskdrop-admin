/**
 * Paged lists use range(), so their sort must be unique: rows that share a
 * timestamp would otherwise come back in a different order on every request
 * and some would repeat on the next page while others never show up.
 * `id` is the tie-breaker. Pure, so it is unit-tested.
 */
type Orderable<Q> = { order: (column: string, options: { ascending: boolean }) => Q };

export function stableOrder<Q extends Orderable<Q>>(q: Q, column: string, ascending = false, tieBreaker = 'id'): Q {
  return q.order(column, { ascending }).order(tieBreaker, { ascending });
}

type Page<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Every row of a list, however long. PostgREST returns at most `max_rows` (1,000 on Supabase) per request without
 * saying so, so a list read in one request stops silently (B122). This asks for `pageSize` rows at a time, moves on by
 * the rows it actually got (so a lower server cap cannot skip anyone) and stops at the first empty page. The query
 * behind `fetchPage` must have a unique sort. A read error throws, so no caller gets a shorter list by mistake.
 */
export async function readAll<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>, what = 'Could not read the list', pageSize = 1000, maxRows = 200_000): Promise<T[]> {
  const out: T[] = [];
  for (;;) {
    const { data, error } = await fetchPage(out.length, out.length + pageSize - 1);
    if (error) throw new Error(`${what}: ${error.message}`, { cause: error });
    if (!data?.length) return out;
    out.push(...data);
    if (out.length > maxRows) throw new Error(`${what}: more than ${maxRows.toLocaleString('en-IN')} rows; narrow it down.`);
  }
}

/** Split a list into pieces of `size`, so a long id list never goes into one .in() address (B132). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** The line a capped list shows when there are more rows than it lists, or null when it shows them all (B132). */
export function shownOf(shown: number, total: number | null): string | null {
  if (total == null || total <= shown) return null;
  return `Showing the first ${shown.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')}.`;
}

/** readAll for reads that report a failure instead of throwing: the original PostgREST error (with its code) comes back. */
export async function tryReadAll<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<{ data: T[]; error: { message: string; code?: string } | null }> {
  try {
    return { data: await readAll(fetchPage), error: null };
  } catch (e) {
    const cause = (e as Error).cause as { message: string; code?: string } | undefined;
    return { data: [], error: cause ?? { message: (e as Error).message } };
  }
}
