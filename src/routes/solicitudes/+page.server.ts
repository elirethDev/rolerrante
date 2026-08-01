import { fail, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth';
import { skillUpgradeCost } from '$lib/rules';
import type { Actions, PageServerLoad } from './$types';

interface SkillRequestRow {
  id: string;
  character_id: string;
  justification: string;
  status: string;
  total_xp_cost: number;
  created_at: string;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  character: { name: string } | null;
  items: Record<string, unknown>[];
}

export const load: PageServerLoad = async ({ locals: { supabase, user, profile } }) => {
  requireAuth({ user, profile });

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, rp_points, skills:character_skills(id, skill_id, level, specialization, skill:skill_id(name, attribute))')
    .eq('player_id', user!.id)
    .eq('status', 'aprobado');

  const characterIds = (characters ?? []).map((c) => c.id);
  let requests: SkillRequestRow[] = [];
  if (characterIds.length > 0) {
    const { data: reqData } = await supabase
      .from('skill_requests')
      .select('*, character:character_id(name), items:skill_request_items(*, skill:skill_id(name))')
      .in('character_id', characterIds)
      .order('created_at', { ascending: false });
    requests = reqData ?? [];
  }

  return { characters: characters ?? [], requests };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const characterId = String(form.get('character_id') ?? '');
    const justification = String(form.get('justification') ?? '').trim();

    if (!characterId || !justification) return fail(400, { message: 'Personaje y justificación son obligatorios' });

    const { data: character } = await supabase
      .from('characters')
      .select('id, rp_points, player_id')
      .eq('id', characterId)
      .eq('player_id', user!.id)
      .single();
    if (!character) return fail(403, { message: 'No puedes solicitar para ese personaje' });

    const { data: currentSkills } = await supabase.from('character_skills').select('*').eq('character_id', characterId);
    const currentMap = new Map(currentSkills?.map((s) => [s.skill_id, s]) ?? []);

    const items: { skill_id: string; from_level: number; to_level: number; xp_cost: number; specialization?: string }[] = [];
    let totalCost = 0;

    for (const [key, value] of form.entries()) {
      if (!key.startsWith('skill_level_')) continue;
      const skillId = key.replace('skill_level_', '');
      const toLevel = Number(value);
      if (toLevel <= 0) continue;
      const current = currentMap.get(skillId);
      const fromLevel = current?.level ?? 0;
      if (toLevel <= fromLevel) continue;
      const cost = skillUpgradeCost(fromLevel, toLevel);
      const specKey = `skill_spec_${skillId}`;
      const spec = String(form.get(specKey) ?? '').trim() || current?.specialization || null;
      items.push({ skill_id: skillId, from_level: fromLevel, to_level: toLevel, xp_cost: cost, specialization: spec ?? undefined });
      totalCost += cost;
    }

    if (items.length === 0) return fail(400, { message: 'Selecciona al menos una mejora' });
    if (totalCost > character.rp_points) return fail(400, { message: `No tienes suficientes puntos (${character.rp_points} disponibles)` });

    const { data: requestRow, error: reqError } = await supabase
      .from('skill_requests')
      .insert({ character_id: characterId, justification, total_xp_cost: totalCost, status: 'pendiente' })
      .select('id')
      .single();

    if (reqError || !requestRow) return fail(400, { message: reqError?.message ?? 'Error' });

    await supabase.from('skill_request_items').insert(
      items.map((i) => ({ request_id: requestRow.id, ...i }))
    );

    throw redirect(303, '/solicitudes');
  },
};
