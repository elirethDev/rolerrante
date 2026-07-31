import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user, profile } }) => {
  if (!user) redirect(303, '/login');

  const { data: characters } = await supabase
    .from('characters')
    .select('*, race:race_id(name)')
    .eq('player_id', user.id)
    .order('created_at', { ascending: false });

  return { characters: characters ?? [], profile };
};
