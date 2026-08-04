import { fail, redirect } from '@sveltejs/kit';
import { verifyTurnstileToken } from '$lib/turnstile';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { session } }) => {
  if (session) redirect(303, '/');
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const username = String(form.get('username') ?? '').trim().toLowerCase();
    const displayName = String(form.get('display_name') ?? '').trim() || username;
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');

    // Verificar CAPTCHA
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      return fail(400, { message: 'Verificación de seguridad fallada. Intenta de nuevo.' });
    }

    const errors: Record<string, string> = {};
    if (!email) errors.email = 'El correo es obligatorio';
    if (!password || password.length < 6) errors.password = 'Mínimo 6 caracteres';
    if (!username || username.length < 3) errors.username = 'Mínimo 3 caracteres';
    if (Object.keys(errors).length) return fail(400, { errors, values: { email, username, display_name: displayName } });

    const { data: existing } = await supabase.from('profiles').select('username').eq('username', username).maybeSingle();
    if (existing) {
      errors.username = 'Ese nombre de usuario ya está en uso';
      return fail(400, { errors, values: { email, username, display_name: displayName } });
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName },
        emailRedirectTo: 'https://rolerrante.pages.dev/login?confirmed=1',
      },
    });

    if (authError) {
      return fail(400, { message: authError.message, values: { email, username, display_name: displayName } });
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        display_name: displayName,
        role: 'pendiente',
      });
    }

    throw redirect(303, '/login?registrado=1');
  },
};