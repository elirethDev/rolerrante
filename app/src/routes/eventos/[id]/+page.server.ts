import { error, fail, redirect } from '@sveltejs/kit';
import { isGMOrAdmin, requireAuth } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, profile, user } }) => {
  const { data: event, error: dbError } = await supabase
    .from('events')
    .select('*, creator:creator_id(username, display_name), participants:event_participants(*, character:character_id(id, name, player_id))')
    .eq('id', params.id)
    .single();

  if (dbError || !event) throw error(404, 'Evento no encontrado');

  let characters: { id: string; name: string }[] = [];
  if (user) {
    const { data: chars } = await supabase
      .from('characters')
      .select('id, name')
      .eq('player_id', user.id)
      .eq('status', 'aprobado');
    characters = chars ?? [];
  }

  const participant = event.participants?.find((p: { character?: { player_id?: string } }) => p.character?.player_id === profile?.id);

  return { event, profile, characters, participant };
};

export const actions: Actions = {
  join: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile } as App.Locals);
    const form = await request.formData();
    const characterId = String(form.get('character_id') ?? '');
    if (!characterId) return fail(400, { message: 'Selecciona un personaje' });

    const { error } = await supabase.from('event_participants').insert({ event_id: params.id, character_id: characterId });
    if (error) return fail(400, { message: error.message });
    throw redirect(303, `/eventos/${params.id}`);
  },

  leave: async ({ params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile } as App.Locals);
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id, character:character_id!inner(id, player_id)')
      .eq('event_id', params.id)
      .eq('character.player_id', user!.id)
      .single();
    if (participant) {
      await supabase.from('event_participants').delete().eq('id', participant.id);
    }
    throw redirect(303, `/eventos/${params.id}`);
  },

  finalize: async ({ request, params, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const xpPerParticipant = Number(form.get('xp') ?? 0);
    if (xpPerParticipant <= 0) return fail(400, { message: 'La XP debe ser mayor que 0' });

    const { error } = await supabase.rpc('finalize_event', { p_event_id: params.id, p_xp_per_participant: xpPerParticipant });
    if (error) return fail(400, { message: error.message });
    throw redirect(303, `/eventos/${params.id}`);
  },
};
