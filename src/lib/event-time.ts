/**
 * Which timestamp to trust for "when did this happen". updated_at moves on any
 * later edit (a fee note, a reversal field, an unrelated task change), so a row
 * touched today would look paid or disputed today. Pure, so it is unit-tested.
 */

/** When a payout was paid: sent_at (RazorpayX sends and stamps it once); a payout paid by hand has none, and its updated_at is the paid time. */
export function paidAt(p: { sent_at?: string | null; updated_at: string }): string {
  return p.sent_at ?? p.updated_at;
}

/** When a dispute started: the dispute's own row, falling back to the task's updated_at for disputes opened before reasons were kept. */
export function disputeSince(disputeCreatedAt: string | null | undefined, taskUpdatedAt: string): string {
  return disputeCreatedAt ?? taskUpdatedAt;
}
