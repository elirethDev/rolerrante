import { fail, redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { verifyTurnstileToken } from '$lib/turnstile';
import type { Actions, PageServerLoad } from './$types';

const AUTH_COOKIE_RE = /^sb-.*-auth-token(?:\.\d+)?$/;

export const applyRememberMe = (cookies: Cookies): void => {
  const authCookies = cookies.getAll().filter(({ name }) => AUTH_COOKIE_RE.test(name));
  for (const { name, value } of authCookies) {
    cookies.set(name, value, { maxAge: undefined, path: '/' });
  }
};

export const load: PageServerLoad = async ({ locals: { session }, url }) => {
  if (session) redirect(303, '/');
  return {
    registrado:
      url.searchParams.get('registrado') === '1' ||
      url.searchParams.get('confirmed') === '1',
    reset: url.searchParams.get('reset') === '1',
  };
};

export const actions: Actions = {
  default: async ({ request, cookies, locals: { supabase } }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const remember = form.get('remember') === 'on';
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');

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

    if (!remember) {
      applyRememberMe(cookies);
    }

    throw redirect(303, '/');
  },
};