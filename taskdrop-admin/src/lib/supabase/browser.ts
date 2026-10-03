import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/db';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** For 'use client' components only -- e.g. the Google sign-in button. */
export function createClient() {
  return createBrowserClient<Database>(URL, ANON_KEY);
}
