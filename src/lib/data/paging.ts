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
