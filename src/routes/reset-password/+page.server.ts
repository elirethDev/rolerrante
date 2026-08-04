import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    const passwordConfirm = String(form.get('confirm_password') ?? '');

    if (!password || !passwordConfirm) {
      return fail(400, { message: 'Las contraseñas son obligatorias' });
    }

    if (password !== passwordConfirm) {
      return fail(400, { message: 'Las contraseñas no coinciden' });
    }

    if (password.length < 6) {
      return fail(400, { message: 'Mínimo 6 caracteres' });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return fail(400, {
        message: 'El enlace expiró. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".',
      });
    }

    throw redirect(303, '/login?reset=1');
  },
};
