import { error, fail, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { user, profile, supabase } }) => {
  requireAuth({ user, profile });

  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('*, character:character_id!inner(id, name, player_id)')
    .eq('id', params.id)
    .single();

  if (storyError || !story) throw error(404, 'Historia no encontrada');

  if (story.character?.player_id !== user!.id) throw error(403, 'No puedes editar esta historia');
  if (story.status !== 'rechazado') throw error(403, 'Solo puedes editar historias rechazadas');

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name')
    .eq('player_id', user!.id)
    .in('status', ['aprobado', 'borrador'])
    .order('name');

  return { story, characters: characters ?? [] };
};

export const actions: Actions = {
  default: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const characterId = String(form.get('character_id') ?? '');
    const title = String(form.get('title') ?? '').trim();
    const content = String(form.get('content') ?? '').trim();

    if (!characterId || !title || !content) {
      return fail(400, { title, content, character_id: characterId, message: 'Personaje, título y contenido son obligatorios' });
    }

    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', characterId)
      .eq('player_id', user!.id)
      .single();
    if (!character) return fail(403, { message: 'No puedes escribir para ese personaje' });

    const { error: updateError } = await supabase
      .from('stories')
      .update({ title, content, character_id: characterId, status: 'pendiente' })
      .eq('id', params.id);

    if (updateError) return fail(400, { message: updateError.message });

    throw redirect(303, `/historias/${params.id}`);
  },
};
