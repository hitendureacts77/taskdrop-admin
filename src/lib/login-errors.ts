/**
 * What the login page may say in red (B130). `?error=` is part of a link anyone can send, so the
 * page never shows it as it is: a known code becomes a fixed sentence, the middleware's own two
 * sign-out sentences (whose only variable part is a number) are kept, and anything else shows
 * nothing.
 */

export type LoginErrorCode = 'google' | 'link' | 'not_admin' | 'unavailable';

export const LOGIN_ERRORS: Record<LoginErrorCode, string> = {
  google: 'Google sign-in did not finish. Try again.',
  link: 'That sign-in link has expired or was already used. Try again.',
  not_admin: 'That account is not a TaskDrop admin account, so it was signed out here. Use the admin Google account or the admin username.',
  unavailable: 'We could not check your admin access just now. Try again in a minute.',
};

/** The middleware's sign-out messages (middleware.ts): idle time and the session cap. */
const MIDDLEWARE_SENTENCES = [
  /^You were signed out after \d{1,5} minutes without activity\. Sign in again\.$/,
  /^Admin sessions last \d{1,4} hours\. Sign in again\.$/,
];

export function loginErrorText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (Object.prototype.hasOwnProperty.call(LOGIN_ERRORS, raw)) return LOGIN_ERRORS[raw as LoginErrorCode];
  return MIDDLEWARE_SENTENCES.some((re) => re.test(raw)) ? raw : null;
}
