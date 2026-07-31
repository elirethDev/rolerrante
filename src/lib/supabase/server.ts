import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
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

/**
 * Crea un cliente con SERVICE_ROLE_KEY que BYPASEA todas las RLS policies.
 * Solo debe usarse en operaciones administrativas donde RLS no sea suficiente
 * (ej: aprobar personajes, historias, solicitudes).
 * NO usar para consultas de lectura que puedan ser resueltas con RLS.
 */
export const loadServiceRole = () => {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};