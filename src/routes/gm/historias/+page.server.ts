import { error, fail } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const { data: stories } = await supabase
    .from('stories')
    .select('*, character:character_id!inner(name, player:player_id!inner(display_name, username))')
    .eq('status', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(50);

  return { stories: stories ?? [] };
};

export const actions: Actions = {
  approve: async ({ request, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');
    const form = await request.formData();
    const storyId = String(form.get('storyId') ?? '');

    const { error: rpcError } = await supabase.rpc('approve_story', {
      p_story_id: storyId,
    });
    if (rpcError) return fail(400, { message: rpcError.message });
    return { success: true };
  },

  reject: async ({ request, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');
    const form = await request.formData();
    const storyId = String(form.get('storyId') ?? '');
    const notes = String(form.get('notes') ?? '');

    const { error: rpcError } = await supabase.rpc('reject_story', {
      p_story_id: storyId,
      p_notes: notes,
    });
    if (rpcError) return fail(400, { message: rpcError.message });
    return { success: true };
  },
};