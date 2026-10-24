/**
 * "50, 80 150" -> [50, 80, 150]: whole numbers only, no repeats, smallest first, at most six.
 * Returns a plain-language message instead when the text can't be used. Used for the promotion
 * tiers in Settings (budgets in rupees, lengths in days).
 */
export function parseTierList(raw: string, min: number, max: number): number[] | string {
  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0) return 'Type at least one number, separated by commas.';
  if (parts.length > 6) return 'Six options at most.';
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n))) return 'Use whole numbers only, separated by commas.';
  if (nums.some((n) => n < min || n > max)) return `Each number has to be between ${min} and ${max}.`;
  return [...new Set(nums)].sort((a, b) => a - b);
}
