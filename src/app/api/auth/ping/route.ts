import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Keeps an admin session's idle clock honest. The middleware does the work:
 * any request it sees from a signed-in admin counts as activity, and one that
 * comes too late gets a 401 instead. IdleGuard calls this while someone is
 * reading or typing on a page without making requests of their own.
 */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
