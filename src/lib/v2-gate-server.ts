import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { getRawEnvironment } from './environment-server';
import { isV2Enabled } from './v2-gate';
import { HIDE_TEST_COOKIE, hideTestFromCookie } from './test-data';

/**
 * Whether this request renders admin design v2. Read once per request.
 * NEXT_PUBLIC_ADMIN_V2 is inlined at build time, so a production build without
 * the variable can never turn v2 on, whatever the database says.
 */
export const getV2 = cache(async (): Promise<boolean> => {
  if (process.env.NEXT_PUBLIC_ADMIN_V2 !== 'on') return false;
  return isV2Enabled(process.env.NEXT_PUBLIC_ADMIN_V2, await getRawEnvironment());
});

export type V2Theme = 'light' | 'dark' | 'system';
export const THEME_COOKIE = 'td_theme';

/** The forced theme from the top-bar button; "system" follows the device. */
export const getV2Theme = cache(async (): Promise<V2Theme> => {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === 'light' || v === 'dark' ? v : 'system';
});

/**
 * "Hide test data": true only when v2 is on AND the viewer switched it on.
 * Page packages call this in their server data functions and leave out rows
 * that src/lib/test-data.ts calls test data (see 07-build-plan-v2.md).
 */
export const getHideTestData = cache(async (): Promise<boolean> => {
  if (!(await getV2())) return false;
  return hideTestFromCookie((await cookies()).get(HIDE_TEST_COOKIE)?.value);
});
