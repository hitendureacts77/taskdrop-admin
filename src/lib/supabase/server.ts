import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Lets this server's queries past the database's gateway-only lockdown
 * (taskdrop-claude-web/supabase/lockdown/gateway_only.sql). Server-only: it is
 * not NEXT_PUBLIC_, so it can never reach a browser bundle.
 */
const GATEWAY_SECRET = process.env.API_GATEWAY_SECRET ?? '';
const GATEWAY_HEADERS: Record<string, string> = GATEWAY_SECRET ? { 'x-taskdrop-gateway': GATEWAY_SECRET } : {};

/**
 * A Supabase client bound to the request's cookies -- RLS applies as the
 * signed-in admin, not as service_role. Safe to call from a Server Component,
 * a Route Handler, or a Server Action.
 *
 * Server Components can only *read* cookies (Next 15 forbids writing them
 * outside a Route Handler or middleware), so `setAll` here is wrapped in a
 * try/catch: a call from a Server Component throws, and that's fine --
 * middleware already refreshes the session on every request, so a Server
 * Component never needs to write one itself.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  // @supabase/ssr 0.5 declares its return type with the generic order of an
  // older supabase-js (Database, SchemaName, Schema). supabase-js 2.116 reads
  // the second slot differently, so every table and RPC typed as never. The
  // object is a real SupabaseClient; this restores its types.
  const client = createServerClient<Database>(URL, ANON_KEY, {
    global: { headers: GATEWAY_HEADERS },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component -- middleware owns refresh instead.
        }
      },
    },
  });
  return client as unknown as SupabaseClient<Database>;
}
