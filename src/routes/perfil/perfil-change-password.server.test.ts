/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { actions } from './+page.server';

const changePasswordFn = actions.changePassword as unknown as (...args: unknown[]) => Promise<any>;

interface AuthFixtures {
  currentError?: unknown;
  updateError?: unknown;
}

const makeSupabase = (fixtures: AuthFixtures = {}) => ({
  auth: {
    signInWithPassword: vi.fn(async () => ({ error: fixtures.currentError ?? null })),
    updateUser: vi.fn(async () => ({ error: fixtures.updateError ?? null })),
  },
});

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  user: unknown = { id: 'u1', email: 'viajero@example.com' },
  profile: unknown = { id: 'u1', role: 'rolero' },
) => ({ supabase, user, profile });

const makeEvent = (supabase: ReturnType<typeof makeSupabase>, fields: Record<string, string>, localsOverride: Record<string, unknown> = {}) =>
  ({
    locals: { ...makeLocals(supabase), ...localsOverride },
    request: new Request('http://localhost/perfil', {
      method: 'POST',
      body: new URLSearchParams(fields).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as unknown as RequestEvent;

const expectRedirect = (fn: () => Promise<unknown>, location: string) => {
  return fn().then(
    () => {
      throw new Error('expected a redirect to be thrown');
    },
    (e) => {
      expect((e as { status?: number }).status).toBe(303);
      expect((e as { location?: string }).location).toBe(location);
    },
  );
};

const VALID = {
  current_password: 'actual123',
  new_password: 'nueva123',
  confirm_password: 'nueva123',
};

describe('perfil changePassword action', () => {
  it('redirects guests to /login (requireAuth)', async () => {
    const supabase = makeSupabase();
    await expectRedirect(
      () => changePasswordFn(makeEvent(supabase, VALID, { user: null, profile: null })),
      '/login',
    );
  });

  it('fails with 400 when the new password is shorter than 6 characters', async () => {
    const supabase = makeSupabase();
    const res = await changePasswordFn(
      makeEvent(supabase, { ...VALID, new_password: 'abc12', confirm_password: 'abc12' }),
    );
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Mínimo 6 caracteres');
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('fails with 400 when the passwords do not match', async () => {
    const supabase = makeSupabase();
    const res = await changePasswordFn(
      makeEvent(supabase, { ...VALID, confirm_password: 'otra123' }),
    );
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Las contraseñas no coinciden');
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('fails with 400 when the current password is incorrect (re-auth rejected)', async () => {
    const supabase = makeSupabase({ currentError: { message: 'Invalid login credentials' } });
    const res = await changePasswordFn(makeEvent(supabase, VALID));
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('La contraseña actual es incorrecta');
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('re-authenticates with the current password then updates the password on success', async () => {
    const supabase = makeSupabase();
    const res = await changePasswordFn(makeEvent(supabase, VALID));
    expect(res).toEqual({ success: true, message: 'Contraseña actualizada' });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'viajero@example.com',
      password: 'actual123',
    });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'nueva123' });
  });

  it('updates the password without re-auth when no current password is provided', async () => {
    const supabase = makeSupabase();
    const res = await changePasswordFn(
      makeEvent(supabase, { new_password: 'nueva123', confirm_password: 'nueva123' }),
    );
    expect(res).toEqual({ success: true, message: 'Contraseña actualizada' });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'nueva123' });
  });

  it('propagates the updateUser error message on failure', async () => {
    const supabase = makeSupabase({ updateError: { message: 'New password is too weak' } });
    const res = await changePasswordFn(makeEvent(supabase, VALID));
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('New password is too weak');
  });
});
