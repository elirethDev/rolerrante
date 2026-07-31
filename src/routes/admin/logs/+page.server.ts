import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, actor:actor_id(username, display_name)')
    .order('created_at', { ascending: false })
    .limit(200);

  return { logs: logs ?? [] };
};