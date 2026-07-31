import { error, fail } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const { data: events } = await supabase
    .from('events')
    .select('*, creator:creator_id!inner(display_name, username)')
    .eq('status', 'finalizacion_pendiente')
    .order('created_at', { ascending: false })
    .limit(50);

  return { events: events ?? [] };
};

export const actions: Actions = {
  finalize: async ({ request, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');
    const form = await request.formData();
    const eventId = String(form.get('eventId') ?? '');
    const xp = parseInt(String(form.get('xp') ?? '0'), 10);

    const { error: rpcError } = await supabase.rpc('finalize_event', {
      p_event_id: eventId,
      p_xp_per_participant: xp,
    });
    if (rpcError) return fail(400, { message: rpcError.message });
    return { success: true };
  },
};