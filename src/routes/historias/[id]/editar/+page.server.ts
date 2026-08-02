import { error, fail, redirect } from '@sveltejs/kit';
import { isGMOrAdmin, requireAuth } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { user, profile, supabase } }) => {
  requireAuth({ user, profile });

  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('*, character:character_id!inner(id, name, player_id)')
    .eq('id', params.id)
    .single();

  if (storyError || !story) throw error(404, 'Historia no encontrada');

  const isOwner = story.character?.player_id === user!.id;
  const isStaff = isGMOrAdmin(profile?.role ?? null);
  if (!isOwner && !isStaff) throw error(403, 'No puedes editar esta historia');

  let charactersQuery = supabase.from('characters').select('id, name');
  if (isStaff) {
    charactersQuery = charactersQuery.eq('status', 'aprobado');
  } else {
    charactersQuery = charactersQuery.eq('player_id', user!.id).in('status', ['aprobado', 'borrador']);
  }
  const { data: characters } = await charactersQuery.order('name');

  return { story, characters: characters ?? [], isStaff };
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

    const { data: story } = await supabase
      .from('stories')
      .select('id, character_id')
      .eq('id', params.id)
      .single();
    if (!story) return fail(403, { message: 'No puedes editar esta historia' });

    const { data: storyCharacter } = await supabase
      .from('characters')
      .select('id, player_id')
      .eq('id', story.character_id)
      .single();
    const isOwner = storyCharacter?.player_id === user!.id;
    const isStaff = isGMOrAdmin(profile?.role ?? null);
    if (!isOwner && !isStaff) return fail(403, { message: 'No puedes editar esta historia' });

    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', characterId)
      .eq(isOwner ? 'player_id' : 'status', isOwner ? user!.id : 'aprobado')
      .single();
    if (!character) return fail(403, { message: 'No puedes escribir para ese personaje' });

    const { error: updateError } = await supabase
      .from('stories')
      .update({ title, content, character_id: characterId })
      .eq('id', params.id);

    if (updateError) return fail(400, { message: updateError.message });

    const { error: auditError } = await supabase.rpc('log_audit', {
      p_action: 'editar',
      p_entity_type: 'story',
      p_entity_id: params.id,
      p_details: { character_id: characterId, title },
    });
    if (auditError) console.error('log_audit falló para story', params.id, auditError);

    throw redirect(303, `/historias/${params.id}`);
  },
};
