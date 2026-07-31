import { error } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const [{ data: characters }, { data: stories }, { data: skillRequests }] = await Promise.all([
    supabase.from('characters').select('*, race:race_id(name), player:player_id!inner(display_name, username)').eq('status', 'pendiente').order('created_at', { ascending: false }).limit(50),
    supabase.from('stories').select('*, character:character_id!inner(id, name, player:player_id!inner(display_name, username))').eq('status', 'pendiente').order('created_at', { ascending: false }).limit(50),
    supabase.from('skill_requests').select('*, character:character_id!inner(id, name, player:player_id!inner(display_name, username)), items:skill_request_items(*, skill:skill_id(name))').eq('status', 'pendiente').order('created_at', { ascending: false }).limit(50),
  ]);

  return { characters: characters ?? [], stories: stories ?? [], skillRequests: skillRequests ?? [] };
};