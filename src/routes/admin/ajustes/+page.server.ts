import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';
import type { Json } from '$lib/supabase/database.types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const { data: settings } = await supabase.from('settings').select('*').order('key');

  return { settings: settings ?? [] };
};

export const actions: Actions = {
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

    const { error: dbError } = await supabase.from('settings').upsert({
      key,
      value: value as Json,
      updated_by: profile!.id,
      updated_at: new Date().toISOString(),
    });
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/ajustes');
  },
};