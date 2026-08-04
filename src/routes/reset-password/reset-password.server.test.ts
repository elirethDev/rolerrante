/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { actions } from './+page.server';

const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

const makeSupabase = (authError: unknown = null) => ({
  auth: {
    updateUser: vi.fn(async () => ({ error: authError })),
  },
});

const makeEvent = (supabase: ReturnType<typeof makeSupabase>, fields: Record<string, string>) => {
  const body = new URLSearchParams(fields).toString();
  return {
    locals: { supabase },
    request: new Request('http://localhost/reset-password', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  } as never;
};

const redirectStatus = (p: Promise<any>): Promise<{ status?: number } | undefined> =>
  p.then(
    () => undefined,
    (e: { status?: number }) => ({ status: e.status }),
  );

describe('reset-password default action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login?reset=1 and updates the password on success', async () => {
    const supabase = makeSupabase();
    const thrown = await redirectStatus(
      defaultFn(makeEvent(supabase, { password: 'nueva123', confirm_password: 'nueva123' })),
    );
    expect(thrown?.status).toBe(303);
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'nueva123' });
  });

  it('fails with 400 when the passwords do not match', async () => {
    const supabase = makeSupabase();
    const res = await defaultFn(
      makeEvent(supabase, { password: 'nueva123', confirm_password: 'otra123' }),
    );
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Las contraseñas no coinciden');
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('fails with 400 when the password is shorter than 6 characters', async () => {
    const supabase = makeSupabase();
    const res = await defaultFn(makeEvent(supabase, { password: 'abc12', confirm_password: 'abc12' }));
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Mínimo 6 caracteres');
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('fails with 400 when a password field is missing', async () => {
    const supabase = makeSupabase();
    const res = await defaultFn(makeEvent(supabase, { password: 'nueva123' }));
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Las contraseñas son obligatorias');
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('returns the friendly expired-link message on an auth error', async () => {
    const supabase = makeSupabase({ message: 'No session found' });
    const res = await defaultFn(
      makeEvent(supabase, { password: 'nueva123', confirm_password: 'nueva123' }),
    );
    expect(res.status).toBe(400);
    expect(res.data.message).toBe(
      'El enlace expiró. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".',
    );
  });
});
