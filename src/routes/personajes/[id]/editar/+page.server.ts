import { error, fail, redirect } from '@sveltejs/kit';
import { isGMOrAdmin, requireAuth, validateImageUrl } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { user, profile, supabase } }) => {
  requireAuth({ user, profile });

  const { data: character, error: dbError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', params.id)
    .single();

  if (dbError || !character) throw error(404, 'Personaje no encontrado');

  const isOwner = character.player_id === user!.id;
  const isStaff = isGMOrAdmin(profile?.role ?? null);
  if (!isOwner && !isStaff) throw error(403, 'No puedes editar este personaje');

  const { data: races } = await supabase.from('races').select('*').order('name');

  return { character, races: races ?? [], isStaff };
};

export const actions: Actions = {
  default: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();

    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('id', params.id)
      .single();
    if (!character) return fail(404, { message: 'Personaje no encontrado' });

    const isOwner = character.player_id === user!.id;
    const isStaff = isGMOrAdmin(profile?.role ?? null);
    if (!isOwner && !isStaff) return fail(403, { message: 'No puedes editar este personaje' });

    const name = String(form.get('name') ?? '').trim();
    const raceId = String(form.get('race_id') ?? '');
    const age = Number(form.get('age') ?? 0);
    const sex = String(form.get('sex') ?? '');
    const physicalDescription = String(form.get('physical_description') ?? '');
    const manaSource = String(form.get('mana_source') ?? 'I') as 'I' | 'E';
    const avatarUrl = String(form.get('avatar_url') ?? '').trim();
    const status = form.get('status') === 'borrador' ? 'borrador' : 'pendiente';

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

    if (Object.keys(errors).length) return fail(400, { errors, message: 'Corrige los campos marcados en rojo' });

    const { error: updateError } = await supabase
      .from('characters')
      .update({
        name,
        race_id: raceId,
        age,
        sex,
        physical_description: physicalDescription,
        mana_source: manaSource,
        ...attrs,
        avatar_url: avatarUrl || null,
        status,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq('id', params.id);

    if (updateError) return fail(400, { message: updateError.message });

    throw redirect(303, `/personajes/${params.id}`);
  },
};
