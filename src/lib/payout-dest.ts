/**
 * Where a withdrawal has to be paid. Pure, so it is unit-tested.
 *
 * The withdrawal itself saves a label of where the person asked for it to go
 * ("UPI · name@bank", or just the UPI id on older rows). admin_payout_queue
 * also joins the person's payout account as it is now, which can differ if
 * they changed their UPI id after asking. The admin pays what the withdrawal
 * was asked for; the current account is only offered as an alternative.
 */

export type Dest =
  | { how: 'UPI'; vpa: string }
  | { how: 'Bank'; name: string | null; account: string; ifsc: string | null }
  | { how: 'MISSING'; why: string };

export type DestSource = {
  snapshot: string | null;
  kind: string | null;
  upi_id: string | null;
  account_name: string | null;
  account_number: string | null;
  ifsc: string | null;
};

/** The full UPI id inside the destination label saved on the withdrawal, or null (bank label, masked copy, empty). */
export function savedUpiId(snapshot: string | null | undefined): string | null {
  const m = /^\s*(?:UPI\s*[·:\-–]\s*)?([^\s@*•]+@[^\s@*•]+)\s*$/i.exec(snapshot ?? '');
  return m ? (m[1] as string) : null;
}

/** The person's payout account as it is on file now. */
export function currentDestination(p: DestSource): Dest {
  if (p.kind === 'upi' && p.upi_id) return { how: 'UPI', vpa: p.upi_id };
  if (p.kind === 'bank' && p.account_number) return { how: 'Bank', name: p.account_name, account: p.account_number, ifsc: p.ifsc };
  const saved = savedUpiId(p.snapshot);
  if (saved) return { how: 'UPI', vpa: saved };
  return {
    how: 'MISSING',
    why: p.snapshot
      ? `Only a masked copy (${p.snapshot}) is on file, which you can’t pay into. Ask them to add their account again.`
      : 'No payout account on file. Ask them to add a UPI id or bank account.',
  };
}

const same = (a: Dest, b: Dest) => (a.how === 'UPI' && b.how === 'UPI' ? a.vpa.toLowerCase() === b.vpa.toLowerCase() : a.how === 'Bank' && b.how === 'Bank' ? a.account === b.account : false);

/** The last 4 digits inside a saved bank label ("Bank · Ravi · ••••1234"), or null. */
export function savedBankLast4(snapshot: string | null | undefined): string | null {
  const m = /^\s*Bank\s*·.*[•*]{2,}\s*([0-9]{4})\s*$/i.exec(snapshot ?? '');
  return m ? (m[1] as string) : null;
}

/** `primary` is what to pay. `current` is set only when the person's account on file now is a different one. */
export function payoutDestinations(p: DestSource): { primary: Dest; current: Dest | null } {
  const current = currentDestination(p);
  const last4 = savedBankLast4(p.snapshot);
  if (last4) {
    // Only a masked bank label is saved: pay the account on file only when it is the same account.
    if (current.how === 'MISSING' || (current.how === 'Bank' && current.account.endsWith(last4))) return { primary: current, current: null };
    return {
      primary: { how: 'MISSING', why: `This withdrawal was asked for the bank account ending ${last4}, which is no longer on file. Check with them before paying the account on file now.` },
      current,
    };
  }
  const saved = savedUpiId(p.snapshot);
  if (!saved) return { primary: current, current: null };
  const primary: Dest = { how: 'UPI', vpa: saved };
  return { primary, current: current.how === 'MISSING' || same(primary, current) ? null : current };
}

/** The destination to pay: the one saved on the withdrawal. */
export const destinationOf = (p: DestSource): Dest => payoutDestinations(p).primary;

/** The "Paid" line of a withdrawal's Details box. Only a paid withdrawal says who paid it. */
export function paidLine(status: string, via: string | null | undefined, byHand: boolean): string {
  if (status === 'paid') return via === 'razorpayx' ? 'By RazorpayX' : 'By hand';
  if (status === 'requested' || status === 'processing') return byHand ? 'Not paid yet · by hand' : 'Not paid yet · RazorpayX sends it';
  return 'Not paid';
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * The status of a withdrawal a person pays by hand. "I'm paying it now" is a lock
 * with no expiry, so a lock that is more than a day old says how long it has been
 * (from when the withdrawal was asked for) instead of claiming someone is paying right now.
 */
export function manualPayLabel(status: string, requestedAt: string, nowMs: number): { label: string; tone: 'blue' | 'gold' | 'red' } {
  if (status !== 'processing') return { label: 'Waiting', tone: 'gold' };
  const age = nowMs - (Date.parse(requestedAt) || nowMs);
  if (age < DAY) return { label: 'You’re paying', tone: 'blue' };
  const days = Math.floor(age / DAY);
  return { label: `Locked ${days} ${days === 1 ? 'day' : 'days'}: pay or give back`, tone: 'red' };
}
