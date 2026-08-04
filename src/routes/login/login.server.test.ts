/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { load, actions } from './+page.server';
import { applyRememberMe } from '$lib/auth/remember';
import { verifyTurnstileToken } from '$lib/turnstile';

vi.mock('$lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn(async () => true),
}));

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

const makeSupabase = (authError: unknown = null) => ({
  auth: {
    signInWithPassword: vi.fn(async () => ({ error: authError })),
  },
});

const makeCookies = (existing: Array<{ name: string; value: string }> = []) => {
  const set = vi.fn();
  const cookies = { getAll: vi.fn(() => existing), set } as unknown as Cookies;
  return { cookies, set };
};

const makeEvent = (supabase: ReturnType<typeof makeSupabase>, cookies: Cookies, fields: Record<string, string>) =>
  ({
    locals: { supabase },
    cookies,
    request: new Request('http://localhost/login', {
      method: 'POST',
      body: new URLSearchParams(fields).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as never;

const redirectStatus = (p: Promise<any>): Promise<{ status?: number } | undefined> =>
  p.then(
    () => undefined,
    (e: { status?: number }) => ({ status: e.status }),
  );

describe('login load()', () => {
  it('reports registrado and reset flags from the query string', async () => {
    const result = await loadFn({
      locals: { session: null },
      url: new URL('http://localhost/login?reset=1&registrado=1'),
    });
    expect(result.registrado).toBe(true);
    expect(result.reset).toBe(true);
  });

  it('redirects already authenticated users to home', async () => {
    const thrown = await redirectStatus(
      loadFn({ locals: { session: { user: { id: 'u1' } } }, url: new URL('http://localhost/login') }),
    );
    expect(thrown?.status).toBe(303);
  });
});

describe('login default action — remember-me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  });

  it('keeps long-term persistence (does not rewrite cookies) when remember is checked', async () => {
    const supabase = makeSupabase();
    const { cookies, set } = makeCookies([{ name: 'sb-abc-auth-token', value: 'jwt' }]);
    const thrown = await redirectStatus(
      defaultFn(makeEvent(supabase, cookies, { email: 'a@b.c', password: '123456', remember: 'on' })),
    );
    expect(thrown?.status).toBe(303);
    expect(set).not.toHaveBeenCalled();
  });

  it('turns the session cookie into a browser-session cookie when remember is unchecked', async () => {
    const supabase = makeSupabase();
    const { cookies, set } = makeCookies([{ name: 'sb-abc-auth-token', value: 'jwt' }]);
    const thrown = await redirectStatus(
      defaultFn(makeEvent(supabase, cookies, { email: 'a@b.c', password: '123456' })),
    );
    expect(thrown?.status).toBe(303);
    expect(set).toHaveBeenCalledWith('sb-abc-auth-token', 'jwt', { maxAge: undefined, path: '/' });
  });

  it('fails with 400 when the Turnstile token is invalid', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);
    const supabase = makeSupabase();
    const { cookies } = makeCookies();
    const res = await defaultFn(makeEvent(supabase, cookies, { email: 'a@b.c', password: '123456' }));
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Verificación de seguridad');
  });

  it('fails with 400 when credentials are missing', async () => {
    const supabase = makeSupabase();
    const { cookies } = makeCookies();
    const res = await defaultFn(makeEvent(supabase, cookies, { email: '', password: '' }));
    expect(res.status).toBe(400);
  });
});

describe('applyRememberMe()', () => {
  it('re-sets only sb-*-auth-token cookies with maxAge undefined and path "/"', () => {
    const existing = [
      { name: 'sb-ref-auth-token', value: 'a' },
      { name: 'sb-ref-auth-token.0', value: 'b' },
      { name: 'theme', value: 'dark' },
    ];
    const { cookies, set } = makeCookies(existing);
    applyRememberMe(cookies);
    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith('sb-ref-auth-token', 'a', { maxAge: undefined, path: '/' });
    expect(set).toHaveBeenCalledWith('sb-ref-auth-token.0', 'b', { maxAge: undefined, path: '/' });
  });

  it('is a no-op when no auth cookie is present', () => {
    const { cookies, set } = makeCookies([{ name: 'theme', value: 'dark' }]);
    applyRememberMe(cookies);
    expect(set).not.toHaveBeenCalled();
  });
});
