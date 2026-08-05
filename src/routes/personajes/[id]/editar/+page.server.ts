import { error, fail, redirect } from '@sveltejs/kit';
import { isGMOrAdmin, requireAuth, validateImageUrl } from '$lib/auth';
import { buildAvatarPath, avatarPublicUrl, validateAvatarUpload } from '$lib/avatars';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';
import type { Actions, PageServerLoad } from './$types';

type EditableFields = {
  name: string;
  raceId: string;
  age: number;
  sex: string;
  physicalDescription: string;
  manaSource: 'I' | 'E';
  avatarUrl: string;
  status: 'borrador' | 'pendiente';
  attrs: Record<string, number>;
};

function parseCharacterFields(form: FormData): EditableFields {
  return {
    name: String(form.get('name') ?? '').trim(),
    raceId: String(form.get('race_id') ?? ''),
    age: Number(form.get('age') ?? 0),
    sex: String(form.get('sex') ?? ''),
    physicalDescription: String(form.get('physical_description') ?? ''),
    manaSource: String(form.get('mana_source') ?? 'I') as 'I' | 'E',
    avatarUrl: String(form.get('avatar_url') ?? '').trim(),
    status: form.get('status') === 'borrador' ? 'borrador' : 'pendiente',
    attrs: {
      attr_fis: Number(form.get('attr_fis') ?? 0),
      attr_des: Number(form.get('attr_des') ?? 0),
      attr_int: Number(form.get('attr_int') ?? 0),
      attr_per: Number(form.get('attr_per') ?? 0),
      attr_esp: Number(form.get('attr_esp') ?? 0),
    },
  };
}

function validateCharacterFields(fields: EditableFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.name) errors.name = 'El nombre es obligatorio';
  if (!fields.raceId) errors.race = 'Selecciona una raza';
  const avatarCheck = validateImageUrl(fields.avatarUrl);
  if (fields.avatarUrl && !avatarCheck.valid) errors.avatar_url = 'URL de avatar no válida';
  return errors;
}

/**
 * Resolve the avatar value for a character form (REQ-AVUP-03/05):
 *  - a multipart `avatar_file` is strictly validated and uploaded to the
 *    character path (char-avatars/{character_id}/...), returning its public URL;
 *  - otherwise the pasted `avatar_url` (validated http/https) is kept as-is.
 * The caller maps the error message to fail() so the Actions return type stays
 * narrow.
 */
async function resolveCharacterAvatar(
  supabase: SupabaseClient<Database>,
  form: FormData,
  characterId: string,
  pastedUrl: string,
): Promise<{ avatarUrl: string | null; error?: string }> {
  const file = form.get('avatar_file');
  if (file instanceof File && file.size > 0) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateAvatarUpload({ bytes, size: file.size, name: file.name });
    if (!validation.ok) return { avatarUrl: null, error: validation.error };
    const path = buildAvatarPath('character', characterId, file.name);
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, bytes, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000',
      });
    if (uploadError) return { avatarUrl: null, error: uploadError.message };
    return { avatarUrl: avatarPublicUrl(path) };
  }
  return { avatarUrl: pastedUrl || null };
}

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

  return { character, races: races ?? [], isStaff, isOwner };
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

    const fields = parseCharacterFields(form);
    const errors = validateCharacterFields(fields);
    if (Object.keys(errors).length) return fail(400, { errors, message: 'Corrige los campos marcados en rojo' });

    const avatar = await resolveCharacterAvatar(supabase, form, params.id, fields.avatarUrl);
    if (avatar.error) return fail(400, { message: avatar.error });
    const avatarUrl = avatar.avatarUrl;

    const { error: updateError } = await supabase
      .from('characters')
      .update({
        name: fields.name,
        race_id: fields.raceId,
        age: fields.age,
        sex: fields.sex,
        physical_description: fields.physicalDescription,
        mana_source: fields.manaSource,
        ...fields.attrs,
        avatar_url: avatarUrl,
        status: fields.status,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq('id', params.id);

    if (updateError) return fail(400, { message: updateError.message });

    throw redirect(303, `/personajes/${params.id}`);
  },
  // Re-approval loop: guarda el contenido editado con la sesión del propietario
  // y delega la transición a revisión (status='pendiente' + limpieza de review_*)
  // al RPC SECURITY DEFINER request_character_review, porque review_notes queda
  // fuera del GRANT UPDATE del propietario.
  request_review: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();

    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('id', params.id)
      .single();
    if (!character) return fail(404, { message: 'Personaje no encontrado' });

    if (character.player_id !== user!.id) {
      return fail(403, { message: 'Solo el propietario puede enviar la ficha a revisión' });
    }

    const fields = parseCharacterFields(form);
    const errors = validateCharacterFields(fields);
    if (Object.keys(errors).length) return fail(400, { errors, message: 'Corrige los campos marcados en rojo' });

    const avatar = await resolveCharacterAvatar(supabase, form, params.id, fields.avatarUrl);
    if (avatar.error) return fail(400, { message: avatar.error });
    const avatarUrl = avatar.avatarUrl;

    const { error: updateError } = await supabase
      .from('characters')
      .update({
        name: fields.name,
        race_id: fields.raceId,
        age: fields.age,
        sex: fields.sex,
        physical_description: fields.physicalDescription,
        mana_source: fields.manaSource,
        ...fields.attrs,
        avatar_url: avatarUrl,
      })
      .eq('id', params.id);

    if (updateError) return fail(400, { message: updateError.message });

    const { error: rpcError } = await supabase.rpc('request_character_review', { p_character_id: params.id });
    if (rpcError) return fail(400, { message: rpcError.message });

    throw redirect(303, `/personajes/${params.id}`);
  },
};
