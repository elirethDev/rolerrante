import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { UserRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

const ROLES: UserRole[] = ['pendiente', 'rolero', 'gm', 'admin'];

// Parse the "rol mínimo de lectura" select: empty string = Público (NULL).
function readMinReadRole(value: unknown): UserRole | null {
  const raw = String(value ?? '').trim();
  return raw && (ROLES as string[]).includes(raw) ? (raw as UserRole) : null;
}

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
    const min_read_role = readMinReadRole(form.get('min_read_role'));
    const requires_approval = form.get('requires_approval') === 'on';

    if (!name) return fail(400, { message: 'El nombre es obligatorio' });

    const { error: dbError } = await locals.supabase
      .from('categories')
      .insert({ name, description, parent_id, sort_order, is_visible: true, min_read_role, requires_approval });
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/foro');
  },

  updateCategory: async ({ request, locals }) => {
    await requireAdmin(locals.profile);
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim() || null;
    const parent_id = String(form.get('parent_id') ?? '').trim() || null;
    const sort_order = Number(form.get('sort_order') ?? 0) || 0;
    const is_visible = form.get('is_visible') === 'on';
    const min_read_role = readMinReadRole(form.get('min_read_role'));
    const requires_approval = form.get('requires_approval') === 'on';

    if (!id || !name) return fail(400, { message: 'ID y nombre son obligatorios' });

    const { error: dbError } = await locals.supabase
      .from('categories')
      .update({ name, description, parent_id, sort_order, is_visible, min_read_role, requires_approval })
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

  // Reorder a category up/down among its siblings by swapping sort_order
  // (FORO-CAT-REORDER). Moving beyond the edge is a silent no-op.
  reorder: async ({ request, locals }) => {
    await requireAdmin(locals.profile);
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const direction = String(form.get('direction') ?? '');
    if (!id || (direction !== 'up' && direction !== 'down')) {
      return fail(400, { message: 'Datos de orden inválidos' });
    }

    const { data: target } = await locals.supabase
      .from('categories')
      .select('parent_id')
      .eq('id', id)
      .maybeSingle<{ parent_id: string | null }>();
    if (!target) return fail(400, { message: 'Categoría no encontrada' });

    const parentId = target.parent_id ?? null;
    const { data: siblings } = await locals.supabase
      .from('categories')
      .select('id, sort_order, parent_id')
      .order('sort_order', { ascending: true });

    // Same-parent grouping + stable secondary key (id) so ties never reorder
    // nondeterministically.
    const sorted = (siblings ?? [])
      .filter((s) => (s as { parent_id: string | null }).parent_id === parentId)
      .sort(
        (a, b) =>
          (a as { sort_order: number }).sort_order -
            (b as { sort_order: number }).sort_order ||
          String((a as { id: string }).id).localeCompare((b as { id: string }).id),
      );

    const index = sorted.findIndex((s) => (s as { id: string }).id === id);
    if (index === -1) return fail(400, { message: 'Categoría no encontrada' });

    const neighborIndex = direction === 'up' ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= sorted.length) {
      // Already at the edge — nothing to swap.
      throw redirect(303, '/admin/foro');
    }

    const current = sorted[index] as { id: string; sort_order: number };
    const neighbor = sorted[neighborIndex] as { id: string; sort_order: number };

    const [a, b] = await Promise.all([
      locals.supabase
        .from('categories')
        .update({ sort_order: neighbor.sort_order })
        .eq('id', current.id),
      locals.supabase
        .from('categories')
        .update({ sort_order: current.sort_order })
        .eq('id', neighbor.id),
    ]);
    if (a.error || b.error) return fail(400, { message: a.error?.message ?? b.error?.message });
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
