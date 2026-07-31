import { error, fail, redirect } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, profile } }) => {
  if (!isGMOrAdmin(profile?.role ?? null)) throw error(403);

  const { data: request, error: dbError } = await supabase
    .from('skill_requests')
    .select('*, character:character_id!inner(*, race:race_id(name), player:player_id!inner(display_name, username)), items:skill_request_items(*, skill:skill_id(name))')
    .eq('id', params.id)
    .single();

  if (dbError || !request) throw error(404, 'Solicitud no encontrada');
  return { request };
};

export const actions: Actions = {
  approve: async ({ params, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403);
    const { error } = await supabase.rpc('approve_skill_request', { p_request_id: params.id, p_notes: null });
    if (error) return fail(400, { message: error.message });
    throw redirect(303, '/gm');
  },
  reject: async ({ request, params, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const notes = String(form.get('notes') ?? '');
    const { error } = await supabase.rpc('reject_skill_request', { p_request_id: params.id, p_notes: notes });
    if (error) return fail(400, { message: error.message });
    throw redirect(303, '/gm');
  },
};