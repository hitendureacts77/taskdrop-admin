/**
 * The Settled card's summary line, from the same rows its tabs count, so the
 * line and the Paid tab always cover the same window. Pure, so it is unit-tested.
 */
export function settledSummary(rows: readonly { status: string; amount_minor: number }[]): { paidMinor: number; paidCount: number } {
  let paidMinor = 0;
  let paidCount = 0;
  for (const r of rows) {
    if (r.status !== 'paid') continue;
    paidMinor += Number(r.amount_minor);
    paidCount += 1;
  }
  return { paidMinor, paidCount };
}
