import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { Database } from '$lib/supabase/database.types';
import type { Actions, PageServerLoad } from './$types';

type UserRole = Database['public']['Enums']['user_role'];

const VALID_ROLES: UserRole[] = ['pendiente', 'rolero', 'gm', 'admin'];

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return { users: users ?? [] };
};

export const actions: Actions = {
  setRole: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const userId = String(form.get('user_id') ?? '');
    const rawRole = String(form.get('role') ?? '');
    if (!userId || !rawRole) return fail(400, { message: 'Usuario y rol son obligatorios' });
    const role = rawRole as UserRole;
    if (!VALID_ROLES.includes(role)) return fail(400, { message: 'Rol inválido' });

    // SEC-05: role changes go through the admin-gated change_role RPC (audited);
    // the direct profiles UPDATE is blocked by RLS/column grants for non-admins.
    const { error: dbError } = await supabase.rpc('change_role', {
      p_user_id: userId,
      p_new_role: role,
    });
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/usuarios');
  },
};