import { error, fail } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { UserRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

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

const ROLES: UserRole[] = ['pendiente', 'rolero', 'gm', 'admin'];

// Click-to-cycle levels for the dashboard permission matrix. Solo se gestionan
// can_view / can_post (lo que la matriz visualiza); can_edit/can_lock se siguen
// administrando en /admin/foro. none -> Ver -> Ver+Publicar -> none.
const LEVELS = ['none', 'view', 'view_post'] as const;
type PermLevel = (typeof LEVELS)[number];
const LEVEL_FLAGS: Record<PermLevel, { can_view: boolean; can_post: boolean }> = {
  none: { can_view: false, can_post: false },
  view: { can_view: true, can_post: false },
  view_post: { can_view: true, can_post: true },
};

function permLevelOf(row: { can_view: boolean; can_post: boolean } | null): PermLevel {
  if (!row) return 'none';
  if (row.can_view && row.can_post) return 'view_post';
  if (row.can_view) return 'view';
  return 'none';
}

export const actions: Actions = {
  // Alternar (ciclar) el permiso Ver/Publicar de una sección+rol desde la matriz
  // del dashboard (OD admin.html: perm-grid editable).
  setSectionPerm: async ({ request, locals }) => {
    if (!isAdmin(locals.profile?.role ?? null)) throw error(403, 'Acceso denegado');
    const form = await request.formData();
    const categoryId = String(form.get('categoryId') ?? '');
    const role = String(form.get('role') ?? '') as UserRole;
    if (!categoryId || !ROLES.includes(role)) {
      return fail(400, { message: 'Datos de permiso inválidos' });
    }

    const { data: current } = await locals.supabase
      .from('section_permissions')
      .select('can_view, can_post')
      .eq('category_id', categoryId)
      .eq('role', role)
      .maybeSingle();

    const next = LEVELS[(LEVELS.indexOf(permLevelOf(current)) + 1) % LEVELS.length];
    const flags = LEVEL_FLAGS[next];

    const { error: dbError } = await locals.supabase
      .from('section_permissions')
      .upsert({ category_id: categoryId, role, can_view: flags.can_view, can_post: flags.can_post });
    if (dbError) return fail(400, { message: dbError.message });

    // Auditar como editar_permisos (mismo patrón que /admin/foro).
    await locals.supabase.rpc('log_audit', {
      p_action: 'editar_permisos',
      p_entity_type: 'category',
      p_entity_id: categoryId,
      p_details: { role, ...flags },
    });

    return { success: true };
  },
};