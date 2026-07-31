import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Cookies } from '@sveltejs/kit';
import type { Database } from './database.types';

export const loadSupabase = (cookies: Cookies) => {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: true, persistSession: true },
    cookies: {
      get: (key: string) => cookies.get(key),
      set: (key: string, value: string, options: Record<string, unknown>) =>
        cookies.set(key, value, { ...options, path: '/' }),
      remove: (key: string, options: Record<string, unknown>) =>
        cookies.delete(key, { ...options, path: '/' }),
    },
  });
};