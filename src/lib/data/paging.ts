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
    if (error) throw new Error(`${what}: ${error.message}`);
    if (!data?.length) return out;
    out.push(...data);
    if (out.length > maxRows) throw new Error(`${what}: more than ${maxRows.toLocaleString('en-IN')} rows; narrow it down.`);
  }
}
