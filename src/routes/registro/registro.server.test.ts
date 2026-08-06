/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { actions } from './+page.server';
import { verifyTurnstileToken } from '$lib/turnstile';

vi.mock('$lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn(async () => true),
}));

const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

type SignUpResult = {
  data: { user: { id: string } | null; session: unknown | null };
  error: unknown;
};

const makeSupabase = (signUpResult: SignUpResult) => ({
  auth: {
    signUp: vi.fn(async () => signUpResult),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
    insert: vi.fn(() => ({})),
  })),
});

const makeEvent = (
  supabase: ReturnType<typeof makeSupabase>,
  fields: Record<string, string> = {},
) => {
  const body = new URLSearchParams({
    ...fields,
    'cf-turnstile-response': 'token',
  }).toString();
  return {
    locals: { supabase },
    request: new Request('http://localhost/registro', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  } as never;
};

const redirectStatus = (p: Promise<any>): Promise<{ status?: number; location?: unknown } | undefined> =>
  p.then(
    () => undefined,
    (e: { status?: number; location?: unknown }) => ({ status: e.status, location: e.location }),
  );

const VALID: Record<string, string> = {
  email: 'viajero@example.com',
  password: 'secreto123',
  confirm_password: 'secreto123',
  username: 'viajero',
  display_name: 'Viajero',
  terms: 'on',
};

describe('registro default action — autoconfirm (Opción A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  });

  it('redirects to home directly when signUp returns a session (email confirmation OFF)', async () => {
    const supabase = makeSupabase({
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
      error: null,
    });
    const thrown = await redirectStatus(defaultFn(makeEvent(supabase, VALID)));
    expect(thrown?.status).toBe(303);
    expect(thrown?.location).toBe('/');
  });

  it('redirects to /login?registrado=1 when signUp returns no session (email confirmation ON fallback)', async () => {
    const supabase = makeSupabase({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });
    const thrown = await redirectStatus(defaultFn(makeEvent(supabase, VALID)));
    expect(thrown?.status).toBe(303);
    expect(thrown?.location).toBe('/login?registrado=1');
  });

  it('always inserts the pending profile after a successful signUp', async () => {
    const insert = vi.fn(() => ({}));
    const supabase = {
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: { id: 'u1' }, session: null },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
        insert,
      })),
    } as any;
    await redirectStatus(defaultFn(makeEvent(supabase, VALID)));
    expect(insert).toHaveBeenCalledWith({
      id: 'u1',
      username: 'viajero',
      display_name: 'Viajero',
      role: 'pendiente',
    });
  });

  it('fails with 400 when the Turnstile token is invalid', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);
    const supabase = makeSupabase({
      data: { user: null, session: null },
      error: { message: 'no captcha' },
    });
    const res = await defaultFn(makeEvent(supabase, VALID));
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Verificación de seguridad');
  });

  it('rejects an already-taken username', async () => {
    const supabase = {
      auth: {
        signUp: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { username: 'viajero' }, error: null })),
          })),
        })),
        insert: vi.fn(),
      })),
    } as any;
    const res = await defaultFn(makeEvent(supabase, VALID));
    expect(res.status).toBe(400);
    expect(res.data.errors.username).toContain('ya está en uso');
  });

  it('fails with 400 when the normativa checkbox is not accepted, signUp not called', async () => {
    const supabase = makeSupabase({
      data: { user: null, session: null },
      error: null,
    });
    const res = await defaultFn(
      makeEvent(supabase, { ...VALID, terms: '' }),
    );
    expect(res.status).toBe(400);
    expect(res.data.errors.terms).toBe('Debes aceptar la normativa');
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('fails with 400 when the passwords do not match, signUp not called', async () => {
    const supabase = makeSupabase({
      data: { user: null, session: null },
      error: null,
    });
    const res = await defaultFn(
      makeEvent(supabase, { ...VALID, confirm_password: 'otra123' }),
    );
    expect(res.status).toBe(400);
    expect(res.data.errors.confirm_password).toBe('Las contraseñas no coinciden');
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('passes the consent timestamp in signUp metadata when terms accepted and confirm matches', async () => {
    const supabase = makeSupabase({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });
    await redirectStatus(defaultFn(makeEvent(supabase, VALID)));
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({
            username: 'viajero',
            display_name: 'Viajero',
            terms_accepted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          }),
        }),
      }),
    );
  });
});
