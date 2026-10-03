import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Refreshes the session cookie on every request. This is the only place
 * (besides a Route Handler) allowed to write cookies in Next 15 -- Server
 * Components can only read them -- so a token that's about to expire has to
 * be renewed here or sessions would silently die mid-visit. Does NOT check
 * admin status; that's checkAdmin() in the (dashboard) layout, which runs
 * after this on every request to a protected route.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(URL, ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and Next internals -- nothing there needs a
    // refreshed session, and running this on every asset request is wasted
    // work.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
