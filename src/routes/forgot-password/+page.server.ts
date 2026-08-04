import { fail } from '@sveltejs/kit';
import { verifyTurnstileToken } from '$lib/turnstile';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');

    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      return fail(400, { message: 'Verificación de seguridad fallada. Intenta de nuevo.' });
    }

    if (!email) {
      return fail(400, { message: 'El correo es obligatorio' });
    }

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://rolerrante.pages.dev/reset-password',
    });

    return {
      success: true,
      message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
    };
  },
};
