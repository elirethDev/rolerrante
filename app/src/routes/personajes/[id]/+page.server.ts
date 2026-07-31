import { error, fail, redirect } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, profile } }) => {
  const { data: character, error: dbError } = await supabase
    .from('characters')
    .select('*, race:race_id(*), skills:character_skills(*, skill:skill_id(*)), stories:stories(id, title, status)')
    .eq('id', params.id)
    .single();

  if (dbError || !character) throw error(404, 'Personaje no encontrado');

  const canView = character.status === 'aprobado' || isGMOrAdmin(profile?.role ?? null) || character.player_id === profile?.id;
  if (!canView) throw error(403, 'No puedes ver este personaje');

  return { character, profile };
};

export const actions: Actions = {
  approve: async ({ params, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403);
    const { error: rpcError } = await supabase.rpc('approve_character', { p_character_id: params.id, p_notes: null });
    if (rpcError) return fail(400, { message: rpcError.message });
    throw redirect(303, `/personajes/${params.id}`);
  },
  reject: async ({ request, params, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const notes = String(form.get('notes') ?? '');
    const { error: rpcError } = await supabase.rpc('reject_character', { p_character_id: params.id, p_notes: notes });
    if (rpcError) return fail(400, { message: rpcError.message });
    throw redirect(303, `/personajes/${params.id}`);
  },
};
