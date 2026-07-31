import { error } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const { data: skillRequests } = await supabase
    .from('skill_requests')
    .select('*, character:character_id!inner(name, player:player_id!inner(display_name, username))')
    .eq('status', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(50);

  return { skillRequests: skillRequests ?? [] };
};