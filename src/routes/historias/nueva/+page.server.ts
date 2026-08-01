import { fail, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth';
import { verifyTurnstileToken } from '$lib/turnstile';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { user, profile, supabase } }) => {
  requireAuth({ user, profile });

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name')
    .eq('player_id', user!.id)
    .in('status', ['aprobado', 'borrador'])
    .order('name');

  return { characters: characters ?? [] };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const characterId = String(form.get('character_id') ?? '');
    const title = String(form.get('title') ?? '').trim();
    const content = String(form.get('content') ?? '').trim();
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');

    // Verificar CAPTCHA
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      return fail(400, { message: 'Verificación de seguridad fallada. Intenta de nuevo.' });
    }

    if (!characterId || !title || !content) {
      return fail(400, { message: 'Personaje, título y contenido son obligatorios' });
    }

    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', characterId)
      .eq('player_id', user!.id)
      .single();
    if (!character) return fail(403, { message: 'No puedes escribir para ese personaje' });

    const { data: story, error } = await supabase
      .from('stories')
      .insert({ character_id: characterId, title, content, status: 'pendiente' })
      .select('id')
      .single();

    if (error) return fail(400, { message: error.message });
    throw redirect(303, `/historias/${story.id}`);
  },
};
