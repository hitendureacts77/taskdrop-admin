import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { liveTokenResponse } from '@/lib/live-token';
import { withinRate } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * The signed-in admin's current access token, for the live panel's private Realtime channel
 * (H37). The login cookies are HttpOnly, so the browser cannot read the session itself. Only the
 * short-lived access token is returned, never the refresh token; LiveProvider keeps it in memory.
 * The middleware refreshes the session before this runs, and LiveProvider sends x-td-background,
 * so these calls do not keep an idle panel signed in.
 */
export async function GET() {
  const check = await checkAdmin();
  const out = await liveTokenResponse(
    check,
    // A token lasts about an hour and is asked for a minute before it ends; 30 a minute is plenty.
    (id) => withinRate(id, 'admin-live-token', 30),
    async () => {
      const supabase = await createClient();
      // checkAdmin() above verified the user with Supabase Auth (getUser).
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  );
  return NextResponse.json(out.body, { status: out.status, headers: { 'Cache-Control': 'no-store' } });
}
