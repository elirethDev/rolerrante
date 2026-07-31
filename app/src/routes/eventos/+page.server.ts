import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  const { data: events } = await supabase
    .from('events')
    .select('*, creator:creator_id(username, display_name)')
    .order('starts_at', { ascending: true })
    .limit(50);

  return { events: events ?? [], profile };
};
