import { scrubEvent } from './scrub.ts';

/**
 * For Sentry's `beforeSendSpan` (B127): a streamed span cannot be dropped there, so when scrubbing
 * fails the span goes out with its name and attributes blanked rather than unscrubbed.
 */
export function scrubSpan<T extends { name?: string; attributes?: unknown }>(span: T): T {
  const clean = scrubEvent(span);
  return clean ?? { ...span, name: 'span', attributes: {} };
}
