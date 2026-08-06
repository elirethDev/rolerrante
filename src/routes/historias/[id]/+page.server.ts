import { error, fail, redirect } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, profile } }) => {
  const { data: story, error: dbError } = await supabase
    .from('stories')
    .select('*, character:character_id!inner(id, name, player_id, status, player:player_id!inner(display_name, username))')
    .eq('id', params.id)
    .single();

  if (dbError || !story) throw error(404, 'Historia no encontrada');

  const canView = story.status === 'aprobado' || profile?.role === 'admin' || profile?.role === 'gm' || story.character?.player_id === profile?.id;
  if (!canView) throw error(403, 'No puedes ver esta historia');

  // SEC-16: never leak GM review fields to public viewers of approved stories.
  // The author keeps them (rejection feedback) and staff see them for review.
  const isOwner = story.character?.player_id === profile?.id;
  const isStaff = isGMOrAdmin(profile?.role ?? null);
  if (!isOwner && !isStaff) {
    const safe = story as unknown as Record<string, unknown>;
    delete safe.review_notes;
    delete safe.reviewed_by;
  }

  return { story, profile };
};

export const actions: Actions = {
  approve: async ({ params, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403);
    const { error: rpcError } = await supabase.rpc('approve_story', { p_story_id: params.id });
    if (rpcError) return fail(400, { message: rpcError.message });
    throw redirect(303, `/historias/${params.id}`);
  },
  reject: async ({ request, params, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const notes = String(form.get('notes') ?? '');
    const { error: dbError } = await supabase.rpc('reject_story', { p_story_id: params.id, p_notes: notes });
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, `/historias/${params.id}`);
  },
};
