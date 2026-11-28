/**
 * Dispute split arithmetic, the same as admin_resolve_dispute_split (user repo migration 255).
 * Pure, so the decide card can preview exactly what the database will do.
 *
 *   part     = what the finished work is worth, 0 < part < offer (the agreed price)
 *   worker   = round(part * workerShare / offer)  (the part less commission at the hired rate)
 *   poster   = charged - part                      (everything else back, the service fee included)
 *   taskdrop = charged - worker - poster           (the commission on the part only)
 */
export type HoldAmounts = { offerMinor: number; chargedMinor: number; workerShareMinor: number };
export type SplitResult = { partMinor: number; workerMinor: number; posterMinor: number; taskdropMinor: number };

export function splitAmounts(h: HoldAmounts, partMinor: number): SplitResult | null {
  const part = Math.round(partMinor);
  if (!Number.isFinite(part) || h.offerMinor <= 0 || part <= 0 || part >= h.offerMinor) return null;
  let worker = Math.round((part * h.workerShareMinor) / h.offerMinor);
  worker = Math.min(Math.max(worker, 0), h.workerShareMinor, part);
  const poster = h.chargedMinor - part;
  if (poster < 0) return null;
  return { partMinor: part, workerMinor: worker, posterMinor: poster, taskdropMinor: h.chargedMinor - worker - poster };
}

/** Slider steps of ₹50 (5,000 paise), but never fewer than 2 positions inside (0, offer). */
export function splitStep(offerMinor: number): number {
  return offerMinor > 10_000 ? 5_000 : 100;
}

/** The starting point of the slider: half the price, on a step. */
export function splitStart(offerMinor: number): number {
  const step = splitStep(offerMinor);
  const half = Math.round(offerMinor / 2 / step) * step;
  return Math.min(Math.max(half, step), offerMinor - step);
}
