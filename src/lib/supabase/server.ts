import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Cookies } from '@sveltejs/kit';
import type { Database } from './database.types';

export const loadSupabase = (cookies: Cookies, cacheHeaders: Record<string, string> = {}) => {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: true, persistSession: true },
    cookies: {
      getAll() {
        return cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        if (headers) Object.assign(cacheHeaders, headers);
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies.set(name, value, { ...options, path: '/' })
          );
        } catch {
          // called from a Server Component / non-response context; cannot set cookies
        }
      },
    },
  });
};
