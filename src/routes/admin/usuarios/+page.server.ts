import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

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
    const role = String(form.get('role') ?? '');
    if (!userId || !role) return fail(400, { message: 'Usuario y rol son obligatorios' });

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