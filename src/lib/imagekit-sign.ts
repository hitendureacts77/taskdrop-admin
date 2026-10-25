import { createHmac } from 'node:crypto';

/**
 * Signing ImageKit picture links, the same way the app's `api` function does
 * (supabase/functions/_shared/imagekit.ts in the app repo). Every picture is
 * uploaded as private, so ImageKit refuses a link without a valid signature.
 *
 * No `server-only` import here so the maths can be tested from Node; the one
 * file that reads the private key (photos.ts) is server-only.
 */

export type ImageKitSignConfig = {
  /** Server only. Never log it or send it to the browser. */
  privateKey: string;
  /** e.g. https://ik.imagekit.io/your_id */
  urlEndpoint: string;
};

/** The sizes the app asks for. `at_max` fits the picture inside the box without enlarging it. */
export const IMAGE_SIZES = {
  thumb: { w: 200, h: 200 },
  card: { w: 640, h: 640 },
  full: { w: 1600, h: 1600 },
} as const;
export type ImageSize = keyof typeof IMAGE_SIZES;

/** A signed link lasts between one and two hours. */
export const URL_SECONDS = 60 * 60;

/** End of the hour after the next one, so every request in the same hour gets the same link. */
export function urlExpiry(nowMs: number): number {
  const hour = Math.floor(nowMs / 1000 / URL_SECONDS);
  return (hour + 2) * URL_SECONDS;
}

const encodePath = (p: string) => p.split('/').map((s) => encodeURIComponent(s)).join('/');

export function signedImageKitUrl(cfg: ImageKitSignConfig, filePath: string, size: ImageSize, nowMs: number): string {
  const { w, h } = IMAGE_SIZES[size];
  const endpoint = cfg.urlEndpoint.replace(/\/+$/, '');
  const rest = `tr:w-${w},h-${h},c-at_max,q-80,f-auto${encodePath(filePath.startsWith('/') ? filePath : `/${filePath}`)}`;
  const expiry = urlExpiry(nowMs);
  const signature = createHmac('sha1', cfg.privateKey).update(`${rest}${expiry}`).digest('hex');
  return `${endpoint}/${rest}?ik-t=${expiry}&ik-s=${signature}`;
}

/** The two settings the admin needs, or null when either is missing or the endpoint is not an ImageKit address. */
export function imageKitSignConfig(env: Record<string, string | undefined>): ImageKitSignConfig | null {
  const privateKey = env.IMAGEKIT_PRIVATE_KEY?.trim() ?? '';
  const urlEndpoint = env.IMAGEKIT_URL_ENDPOINT?.trim() ?? '';
  if (!privateKey || !/^https:\/\/ik\.imagekit\.io\/.+/.test(urlEndpoint)) return null;
  return { privateKey, urlEndpoint: urlEndpoint.replace(/\/+$/, '') };
}

const MEDIA_REF = /^media:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** The registry id inside a "media:<id>" reference, or null for anything else (a storage path, say). */
export function mediaRefId(ref: string | null | undefined): string | null {
  const m = ref ? MEDIA_REF.exec(ref) : null;
  return m?.[1] ? m[1].toLowerCase() : null;
}
