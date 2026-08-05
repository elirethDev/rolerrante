import { fail, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth';
import { verifyTurnstileToken } from '$lib/turnstile';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { user, profile } }) => {
  requireAuth({ user, profile });
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });

    const form = await request.formData();
    const title = String(form.get('title') ?? '').trim();
    const type = String(form.get('type') ?? 'evento') as 'casual' | 'evento' | 'campana';
    const startsAt = String(form.get('starts_at') ?? '');
    const endsAt = String(form.get('ends_at') ?? '') || null;
    const maxPlayers = Number(form.get('max_players') ?? 0) || null;
    const location = String(form.get('location') ?? '').trim() || null;
    const description = String(form.get('description') ?? '').trim();
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');

    // Verificar CAPTCHA
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      return fail(400, { message: 'Verificación de seguridad fallada. Intenta de nuevo.' });
    }

    if (!title || !startsAt) return fail(400, { message: 'Título y fecha de inicio son obligatorios' });

    const { data: event, error: dbError } = await supabase
      .from('events')
      .insert({
        creator_id: user!.id,
        title,
        type,
        starts_at: startsAt,
        ends_at: endsAt,
        max_players: maxPlayers,
        location,
        description,
        status: 'publicado',
      })
      .select('id')
      .single();

    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, `/eventos/${event.id}`);
  },
};