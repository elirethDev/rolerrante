import { error, fail } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const { data: characters } = await supabase
    .from('characters')
    .select('*, race:race_id(name), player:player_id!inner(display_name, username)')
    .eq('status', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(50);

  return { characters: characters ?? [] };
};

export const actions: Actions = {
  approve: async ({ request, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');
    const form = await request.formData();
    const charId = String(form.get('charId') ?? '');
    const { error: rpcError } = await supabase.rpc('approve_character', { p_character_id: charId });
    if (rpcError) return fail(400, { message: rpcError.message });
    return { success: true };
  },
  reject: async ({ request, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');
    const form = await request.formData();
    const charId = String(form.get('charId') ?? '');
    const notes = String(form.get('notes') ?? '');
    const { error: rpcError } = await supabase.rpc('reject_character', { p_character_id: charId, p_notes: notes });
    if (rpcError) return fail(400, { message: rpcError.message });
    return { success: true };
  },
};