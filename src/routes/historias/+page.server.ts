import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  const { data: stories, error } = await supabase
    .from('stories')
    .select('*, character:character_id!inner(id, name, status, player:player_id!inner(display_name, username))')
    .order('created_at', { ascending: false })
    .limit(50);

  return { stories: stories ?? [], profile };
};
