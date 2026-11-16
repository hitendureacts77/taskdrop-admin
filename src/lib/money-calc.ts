/**
 * Splits admin_money_position's "ready to withdraw" (earnings + clearing + on
 * the way) into what each part means. Pure, so it is unit-tested.
 */
export function withdrawalMoney(pos: { earningsMinor: number; clearingMinor: number; inFlightMinor: number }): {
  /** Earnings people can still ask to withdraw. */
  askMinor: number;
  /** Earnings still clearing: not withdrawable yet. */
  clearingMinor: number;
  /** Already asked for and not yet settled. */
  onTheWayMinor: number;
  /** What the payout account must be able to send right now. */
  coverMinor: number;
} {
  return {
    askMinor: pos.earningsMinor,
    clearingMinor: pos.clearingMinor,
    onTheWayMinor: pos.inFlightMinor,
    coverMinor: pos.earningsMinor + pos.inFlightMinor,
  };
}

const FUNCTION_MISSING = /could not find the function|does not exist|PGRST202|42883/i;

/**
 * What to say when admin_money_position fails (B137). Only a missing function is a setup gap (migration 066); any
 * other failure (an outage, a permission change) is shown as it is, so it is not mistaken for a setup notice.
 */
export function positionProblem(error: { message: string; code?: string } | null): string | null {
  if (!error) return null;
  if (FUNCTION_MISSING.test(`${error.code ?? ''} ${error.message}`)) return 'The money position function is missing on this database (migration 066).';
  return `Could not read the money position: ${error.message}`;
}
