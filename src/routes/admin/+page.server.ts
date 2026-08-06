import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const [
    { count: users },
    { count: nonAdmin },
    { count: logs },
    { data: recentLogs },
    { data: categories },
    { data: sectionPermissions },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('role', 'eq', 'admin'),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
    supabase
      .from('audit_logs')
      .select('*, actor:actor_id(username, display_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('section_permissions').select('*'),
  ]);

  const lastAction = recentLogs?.[0] ?? null;

  return {
    users: users ?? 0,
    nonAdmin: nonAdmin ?? 0,
    logs: logs ?? 0,
    recentLogs: recentLogs ?? [],
    lastAction,
    // Read-only governance overview (OD extras): rows = forum categories,
    // columns = the 4 user roles, cells = effective section_permissions.
    categories: categories ?? [],
    sectionPermissions: sectionPermissions ?? [],
  };
};