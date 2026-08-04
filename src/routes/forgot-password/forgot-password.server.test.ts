/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { actions } from './+page.server';
import { verifyTurnstileToken } from '$lib/turnstile';

vi.mock('$lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn(async () => true),
}));

const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

const makeSupabase = (authError: unknown = null) => ({
  auth: {
    resetPasswordForEmail: vi.fn(async () => ({ error: authError })),
  },
});

const makeEvent = (
  supabase: ReturnType<typeof makeSupabase>,
  fields: Record<string, string>,
) => {
  const body = new URLSearchParams({ ...fields, 'cf-turnstile-response': 'token' }).toString();
  return {
    locals: { supabase },
    request: new Request('http://localhost/forgot-password', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  } as never;
};

describe('forgot-password default action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  });

  it('always returns the friendly success message and calls resetPasswordForEmail with redirectTo', async () => {
    const supabase = makeSupabase();
    const res = await defaultFn(makeEvent(supabase, { email: 'a@b.c' }));
    expect(res).toEqual({
      success: true,
      message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
    });
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.c', {
      redirectTo: 'https://rolerrante.pages.dev/reset-password',
    });
  });

  it('does not leak account existence when the provider errors', async () => {
    const supabase = makeSupabase({ message: 'no user found' });
    const res = await defaultFn(makeEvent(supabase, { email: 'ghost@b.c' }));
    expect(res).toEqual({
      success: true,
      message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
    });
  });

  it('fails with 400 when the Turnstile token is invalid', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);
    const supabase = makeSupabase();
    const res = await defaultFn(makeEvent(supabase, { email: 'a@b.c' }));
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Verificación de seguridad');
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('fails with 400 when the email is missing', async () => {
    const supabase = makeSupabase();
    const res = await defaultFn(makeEvent(supabase, { email: '' }));
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('El correo es obligatorio');
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
