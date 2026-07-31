import { fail, redirect } from '@sveltejs/kit';
import { verifyTurnstileToken } from '$lib/turnstile';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { session }, url }) => {
  if (session) redirect(303, '/');
  return { registrado: url.searchParams.get('registrado') === '1' };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');

    // Verificar CAPTCHA
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      return fail(400, { message: 'Verificación de seguridad fallada. Intenta de nuevo.' });
    }

    if (!email || !password) {
      return fail(400, { message: 'Correo y contraseña son obligatorios' });
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return fail(400, { message: error.message });
    }

    throw redirect(303, '/');
  },
};