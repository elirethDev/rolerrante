import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const [{ data: users }, { data: settings }, { data: logs }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('settings').select('*').order('key'),
    supabase.from('audit_logs').select('*, actor:actor_id(username, display_name)').order('created_at', { ascending: false }).limit(100),
  ]);

  return { users: users ?? [], settings: settings ?? [], logs: logs ?? [] };
};

export const actions: Actions = {
  setRole: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const userId = String(form.get('user_id') ?? '');
    const role = String(form.get('role') ?? '');
    if (!userId || !role) return fail(400, { message: 'Usuario y rol son obligatorios' });

    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) return fail(400, { message: error.message });
    throw redirect(303, '/admin');
  },

  saveSetting: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const key = String(form.get('key') ?? '');
    const valueRaw = String(form.get('value') ?? '');
    if (!key) return fail(400, { message: 'Clave obligatoria' });

    let value: unknown = valueRaw;
    try {
      value = JSON.parse(valueRaw);
    } catch {
      // keep as string
    }

    const { error } = await supabase.from('settings').upsert({ key, value, updated_by: profile!.id, updated_at: new Date().toISOString() });
    if (error) return fail(400, { message: error.message });
    throw redirect(303, '/admin');
  },
};
