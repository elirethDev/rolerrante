import { fail, redirect } from '@sveltejs/kit';
import { requireAuth, validateImageUrl } from '$lib/auth';
import { skillCreationCost } from '$lib/rules';
import { verifyTurnstileToken } from '$lib/turnstile';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { user, profile, supabase } }) => {
  requireAuth({ user, profile });
  const { data: races } = await supabase.from('races').select('*').order('name');
  const { data: skills } = await supabase.from('skills').select('*').order('name');
  const { data: settings } = await supabase.from('settings').select('value').eq('key', 'character_creation_points').single();
  const creationPoints = (settings?.value as number) ?? 25;
  return { races: races ?? [], skills: skills ?? [], creationPoints };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');

    // Verificar CAPTCHA
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      return fail(400, { message: 'Verificación de seguridad fallada. Intenta de nuevo.' });
    }

    const name = String(form.get('name') ?? '').trim();
    const raceId = String(form.get('race_id') ?? '');
    const age = Number(form.get('age') ?? 0);
    const sex = String(form.get('sex') ?? '');
    const physicalDescription = String(form.get('physical_description') ?? '');
    const manaSource = String(form.get('mana_source') ?? 'I') as 'I' | 'E';
    const avatarUrl = String(form.get('avatar_url') ?? '').trim();

    const attrs = {
      attr_fis: Number(form.get('attr_fis') ?? 0),
      attr_des: Number(form.get('attr_des') ?? 0),
      attr_int: Number(form.get('attr_int') ?? 0),
      attr_per: Number(form.get('attr_per') ?? 0),
      attr_esp: Number(form.get('attr_esp') ?? 0),
    };

    const errors: Record<string, string> = {};
    if (!name) errors.name = 'El nombre es obligatorio';
    if (!raceId) errors.race = 'Selecciona una raza';

    const avatarCheck = validateImageUrl(avatarUrl);
    if (avatarUrl && !avatarCheck.valid) errors.avatar_url = 'URL de avatar no válida';

    const attrLabels: Record<string, string> = { attr_fis: 'Físico', attr_des: 'Destreza', attr_int: 'Inteligencia', attr_per: 'Percepción', attr_esp: 'Espíritu' };
    for (const [key, value] of Object.entries(attrs)) {
      if (value < 4 || value > 10) {
        const label = attrLabels[key] ?? key;
        errors[key] = `${label} debe estar entre 4 y 10 (recibido: ${value})`;
      }
    }

    if (Object.keys(errors).length) return fail(400, { errors, message: 'Corrige los campos marcados en rojo' });

    const skillLevels: Record<string, { level: number; specialization?: string }> = {};
    let spentPoints = 0;
    for (const [key, value] of form.entries()) {
      if (key.startsWith('skill_level_')) {
        const skillId = key.replace('skill_level_', '');
        const level = Number(value);
        if (level > 0) {
          skillLevels[skillId] = { level };
          spentPoints += skillCreationCost(level);
        }
      }
      if (key.startsWith('skill_spec_')) {
        const skillId = key.replace('skill_spec_', '');
        const spec = String(value).trim();
        if (skillLevels[skillId]) skillLevels[skillId].specialization = spec;
      }
    }

    const { data: settings } = await supabase.from('settings').select('value').eq('key', 'character_creation_points').single();
    const creationPoints = (settings?.value as number) ?? 25;
    if (spentPoints > creationPoints) {
      return fail(400, { message: `Has gastado ${spentPoints} de ${creationPoints} puntos disponibles` });
    }

    const { data: character, error } = await supabase
      .from('characters')
      .insert({
        player_id: user!.id,
        name,
        race_id: raceId,
        age,
        sex,
        physical_description: physicalDescription,
        mana_source: manaSource,
        ...attrs,
        avatar_url: avatarUrl || null,
        rp_points: creationPoints - spentPoints,
        status: 'pendiente',
      })
      .select('id')
      .single();

    if (error || !character) return fail(400, { message: error?.message ?? 'Error al crear personaje' });

    const skillRows = Object.entries(skillLevels).map(([skill_id, data]) => ({
      character_id: character.id,
      skill_id,
      level: data.level,
      specialization: data.specialization ?? null,
    }));
    if (skillRows.length) {
      await supabase.from('character_skills').insert(skillRows);
    }

    throw redirect(303, `/personajes/${character.id}`);
  },
};
