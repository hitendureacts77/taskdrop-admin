/**
 * What a bank or UPI reference (UTR) must look like before a withdrawal is
 * recorded as paid. Pure, so it is unit-tested. The browser pattern and the
 * server action use the same rules.
 */
export type RefChannel = 'upi' | 'bank' | 'other';

const RULES: Record<RefChannel, { pattern: string; title: string }> = {
  // UPI reference numbers (UTR / RRN) are 12 digits.
  upi: { pattern: ' *[0-9]{12} *', title: 'The 12-digit UPI reference from your UPI app, for example 624100983317.' },
  // IMPS is 12 digits; NEFT is 16 letters and digits; RTGS up to 22.
  bank: { pattern: ' *[A-Za-z0-9]{8,22} *', title: 'The bank reference (UTR), 8 to 22 letters and digits, with no spaces.' },
  other: { pattern: ' *[^ ].{1,198}[^ ] *', title: 'Say how you paid and give its reference, at least 3 characters.' },
};

export const referenceRule = (channel: RefChannel) => RULES[channel];

export function checkReference(channel: RefChannel, raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (!new RegExp(`^(?:${RULES[channel].pattern})$`).test(raw)) {
    const what =
      channel === 'upi' ? 'a 12-digit UPI reference (UTR)' : channel === 'bank' ? 'a bank reference (UTR) of 8 to 22 letters and digits, without spaces' : 'how you paid and its reference, at least 3 characters';
    return { ok: false, message: `Type ${what}. What you typed doesn’t look like one.` };
  }
  return { ok: true, value };
}
