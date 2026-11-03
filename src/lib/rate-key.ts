import { createHash } from 'node:crypto';

/**
 * The shared limiter counts hits per person (a uuid). A network address is not a uuid, so it is
 * turned into a stable one: the first 128 bits of its SHA-256, shaped like a version-8 uuid.
 * The same address always gives the same uuid, and the uuid does not reveal the address.
 */
export function keyToUuid(key: string): string {
  const h = createHash('sha256').update(`taskdrop-rate:${key}`).digest('hex').slice(0, 32);
  const variant = '89ab'[parseInt(h.charAt(16), 16) % 4];
  const hex = `${h.slice(0, 12)}8${h.slice(13, 16)}${variant}${h.slice(17)}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The caller's network address as the platform reports it; 'unknown' when there is none. */
export function clientAddress(headers: Pick<Headers, 'get'>): string {
  const vercel = (headers.get('x-vercel-forwarded-for') ?? '').trim();
  if (vercel) return (vercel.split(',')[0] ?? '').trim();
  const fwd = (((headers.get('x-forwarded-for') ?? '').split(',')[0]) ?? '').trim();
  return fwd || (headers.get('x-real-ip') ?? '').trim() || 'unknown';
}
