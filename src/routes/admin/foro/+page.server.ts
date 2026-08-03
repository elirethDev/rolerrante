import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { UserRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

const ROLES: UserRole[] = ['pendiente', 'rolero', 'gm', 'admin'];

async function requireAdmin(profile: { role?: UserRole | null } | null) {
  if (!isAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');
}

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.profile);

  const [{ data: categories }, { data: sectionPermissions }] = await Promise.all([
    locals.supabase.from('categories').select('*').order('sort_order'),
    locals.supabase.from('section_permissions').select('*'),
  ]);

  return { categories: categories ?? [], sectionPermissions: sectionPermissions ?? [] };
};

export const actions: Actions = {
  // Category / subforum CRUD (REQ-FORUM-04.1)
  createCategory: async ({ request, locals }) => {
    await requireAdmin(locals.profile);
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim() || null;
    const parent_id = String(form.get('parent_id') ?? '').trim() || null;
    const sort_order = Number(form.get('sort_order') ?? 0) || 0;

    if (!name) return fail(400, { message: 'El nombre es obligatorio' });

    const { error: dbError } = await locals.supabase
      .from('categories')
      .insert({ name, description, parent_id, sort_order, is_visible: true });
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/foro');
  },

  updateCategory: async ({ request, locals }) => {
    await requireAdmin(locals.profile);
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim() || null;
    const sort_order = Number(form.get('sort_order') ?? 0) || 0;
    const is_visible = form.get('is_visible') === 'on';

    if (!id || !name) return fail(400, { message: 'ID y nombre son obligatorios' });

    const { error: dbError } = await locals.supabase
      .from('categories')
      .update({ name, description, sort_order, is_visible })
      .eq('id', id);
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/foro');
  },

  toggleVisibility: async ({ request, locals }) => {
    await requireAdmin(locals.profile);
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const is_visible = form.get('is_visible') === 'on';
    if (!id) return fail(400, { message: 'ID obligatorio' });

    const { error: dbError } = await locals.supabase
      .from('categories')
      .update({ is_visible })
      .eq('id', id);
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/foro');
  },

  deleteCategory: async ({ request, locals }) => {
    await requireAdmin(locals.profile);
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    if (!id) return fail(400, { message: 'ID obligatorio' });

    const { error: dbError } = await locals.supabase.from('categories').delete().eq('id', id);
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/foro');
  },

  // Section permission toggles (REQ-FORUM-04.2/04.4), audited with editar_permisos
  setSectionPermissions: async ({ request, locals }) => {
    await requireAdmin(locals.profile);
    const form = await request.formData();
    const categoryId = String(form.get('categoryId') ?? '');
    const role = String(form.get('role') ?? '') as UserRole;
    if (!categoryId || !ROLES.includes(role)) {
      return fail(400, { message: 'Datos de permiso inválidos' });
    }
    const flags = {
      can_view: form.get('can_view') === 'on',
      can_post: form.get('can_post') === 'on',
      can_edit: form.get('can_edit') === 'on',
      can_lock: form.get('can_lock') === 'on',
    };

    const { error: dbError } = await locals.supabase
      .from('section_permissions')
      .upsert({ category_id: categoryId, role, ...flags });
    if (dbError) return fail(400, { message: dbError.message });

    await locals.supabase.rpc('log_audit', {
      p_action: 'editar_permisos',
      p_entity_type: 'category',
      p_entity_id: categoryId,
      p_details: { role, ...flags },
    });
    return { success: true };
  },
};
