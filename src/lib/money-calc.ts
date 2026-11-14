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
