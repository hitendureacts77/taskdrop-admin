import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { getLiveSnapshot } from '@/lib/live';

export const dynamic = 'force-dynamic';

/**
 * The live strip, feed and sidebar badges, re-read from the server. The
 * browser calls this every minute, when the tab comes back into view, and
 * after reconnecting, so a missed Realtime broadcast can never leave a wrong
 * number on screen.
 *
 * LiveProvider marks these calls with x-td-background, and the middleware does
 * not count them as activity, so a panel left open still times out.
 */
export async function GET() {
  const check = await checkAdmin();
  if (check.status !== 'ok') {
    return NextResponse.json({ ok: false }, { status: check.status === 'unauthenticated' ? 401 : 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const snapshot = await getLiveSnapshot();
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}
