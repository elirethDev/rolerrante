import { error, fail, redirect } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isGMOrAdmin, requireAuth } from '$lib/auth';
import type { Database } from '$lib/supabase/database.types';
import type { Profile } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

/**
 * Session management gate (GM/admin or event creator), mirroring the page-level
 * `canManage` used for the event management card. Guests are redirected by
 * `requireAuth` before reaching this check.
 */
async function requireEventManager(
  supabase: SupabaseClient<Database>,
  eventId: string,
  profile: Profile | null,
) {
  const { data: event } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) throw error(404, 'Evento no encontrado');
  const isStaff = isGMOrAdmin(profile?.role ?? null);
  if (!isStaff && event.creator_id !== profile?.id) {
    throw error(403, 'No tienes permisos para gestionar las sesiones');
  }
}

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

  const { data: sessions } = await supabase
    .from('event_sessions')
    .select('*')
    .eq('event_id', params.id)
    .order('session_date');

  return { event, profile, characters, participant, sessions: sessions ?? [] };
};

export const actions: Actions = {
  join: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const characterId = String(form.get('character_id') ?? '');
    if (!characterId) return fail(400, { message: 'Selecciona un personaje' });

    const { error } = await supabase.from('event_participants').insert({ event_id: params.id, character_id: characterId });
    if (error) return fail(400, { message: error.message });
    throw redirect(303, `/eventos/${params.id}`);
  },

  leave: async ({ params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
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

    const { error: rpcError } = await supabase.rpc('finalize_event', { p_event_id: params.id, p_xp_per_participant: xpPerParticipant });
    if (rpcError) return fail(400, { message: rpcError.message });
    throw redirect(303, `/eventos/${params.id}`);
  },

  createSession: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    await requireEventManager(supabase, params.id, profile);

    const form = await request.formData();
    const sessionDate = String(form.get('session_date') ?? '').trim();
    const title = String(form.get('title') ?? '').trim() || null;
    const summary = String(form.get('summary') ?? '').trim() || null;
    const countsAsMasteo = form.get('counts_as_masteo') === 'on';
    if (!sessionDate) return fail(400, { message: 'La fecha de la sesión es obligatoria' });

    const { data: session, error: dbError } = await supabase
      .from('event_sessions')
      .insert({ event_id: params.id, session_date: sessionDate, title, summary, counts_as_masteo: countsAsMasteo })
      .select('id')
      .single();
    if (dbError) return fail(400, { message: dbError.message });

    const { error: auditError } = await supabase.rpc('log_audit', {
      p_action: 'editar',
      p_entity_type: 'event_session',
      p_entity_id: session.id,
      p_details: { event_id: params.id, session_date: sessionDate, title, summary, counts_as_masteo: countsAsMasteo },
    });
    if (auditError) console.error('log_audit falló para crear sesión', session.id, auditError);

    throw redirect(303, `/eventos/${params.id}`);
  },

  updateSession: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    await requireEventManager(supabase, params.id, profile);

    const form = await request.formData();
    const sessionId = String(form.get('session_id') ?? '').trim();
    const sessionDate = String(form.get('session_date') ?? '').trim();
    const title = String(form.get('title') ?? '').trim() || null;
    const summary = String(form.get('summary') ?? '').trim() || null;
    const countsAsMasteo = form.get('counts_as_masteo') === 'on';
    if (!sessionId) return fail(400, { message: 'Sesión obligatoria' });
    if (!sessionDate) return fail(400, { message: 'La fecha de la sesión es obligatoria' });

    const { error: dbError } = await supabase
      .from('event_sessions')
      .update({ session_date: sessionDate, title, summary, counts_as_masteo: countsAsMasteo })
      .eq('id', sessionId)
      .eq('event_id', params.id);
    if (dbError) return fail(400, { message: dbError.message });

    const { error: auditError } = await supabase.rpc('log_audit', {
      p_action: 'editar',
      p_entity_type: 'event_session',
      p_entity_id: sessionId,
      p_details: { event_id: params.id, session_date: sessionDate, title, summary, counts_as_masteo: countsAsMasteo },
    });
    if (auditError) console.error('log_audit falló para editar sesión', sessionId, auditError);

    throw redirect(303, `/eventos/${params.id}`);
  },

  deleteSession: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    await requireEventManager(supabase, params.id, profile);

    const form = await request.formData();
    const sessionId = String(form.get('session_id') ?? '').trim();
    if (!sessionId) return fail(400, { message: 'Sesión obligatoria' });

    const { data: session } = await supabase
      .from('event_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('event_id', params.id)
      .maybeSingle();
    if (!session) return fail(404, { message: 'Sesión no encontrada' });

    const { error: dbError } = await supabase
      .from('event_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('event_id', params.id);
    if (dbError) return fail(400, { message: dbError.message });

    const { error: auditError } = await supabase.rpc('log_audit', {
      p_action: 'editar',
      p_entity_type: 'event_session',
      p_entity_id: sessionId,
      p_details: {
        event_id: params.id,
        session_date: session.session_date,
        title: session.title,
        summary: session.summary,
        counts_as_masteo: session.counts_as_masteo,
      },
    });
    if (auditError) console.error('log_audit falló para eliminar sesión', sessionId, auditError);

    throw redirect(303, `/eventos/${params.id}`);
  },
};
