import { describe, expect, it, vi, type Mock } from 'vitest';
import type { CookieMethodsServer } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { createServerClient } from '@supabase/ssr';
import { loadSupabase } from './server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
}));

type CapturedCookieMethods = Required<Pick<CookieMethodsServer, 'getAll' | 'setAll'>>;

const createServerClientMock = createServerClient as unknown as Mock;

const fakeCookies = (): { cookies: Cookies; set: Mock } => {
  const set = vi.fn();
  const getAll = vi.fn(() => []);
  const cookies = { getAll, set, delete: vi.fn() } as unknown as Cookies;
  return { cookies, set };
};

/** Invoke loadSupabase and return the cookies config captured by the mocked createServerClient. */
const captureCookieMethods = (cookies: Cookies, cacheHeaders: Record<string, string> = {}): CapturedCookieMethods => {
  let captured: CapturedCookieMethods | undefined;
  createServerClientMock.mockImplementation((_url, _key, options: { cookies: CapturedCookieMethods }) => {
    captured = options.cookies;
    return { __cookieOpts: options.cookies } as unknown as SupabaseClient<Database>;
  });
  loadSupabase(cookies, cacheHeaders);
  if (!captured) {
    throw new Error('createServerClient was not invoked with a cookies config');
  }
  return captured;
};

describe('loadSupabase server client', () => {
  it('exposes getAll and setAll cookie methods', () => {
    const { cookies } = fakeCookies();
    const methods = captureCookieMethods(cookies);

    expect(typeof methods.getAll).toBe('function');
    expect(typeof methods.setAll).toBe('function');
  });

  it('setAll sets cookies with path "/" and captures cache headers for response propagation', () => {
    const { cookies, set } = fakeCookies();
    const cacheHeaders: Record<string, string> = {};
    const methods = captureCookieMethods(cookies, cacheHeaders);

    methods.setAll(
      [{ name: 'sb-token', value: 'x', options: { httpOnly: true } }],
      {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      }
    );

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith('sb-token', 'x', { httpOnly: true, path: '/' });
    expect(cacheHeaders).toEqual({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    });
  });

  it('swallows errors thrown by the underlying cookie set', () => {
    const { cookies, set } = fakeCookies();
    set.mockImplementation(() => {
      throw new Error('cannot set cookies outside a response context');
    });
    const cacheHeaders: Record<string, string> = {};
    const methods = captureCookieMethods(cookies, cacheHeaders);

    expect(() => methods.setAll([{ name: 'sb-token', value: 'x', options: {} }], { Pragma: 'no-cache' })).not.toThrow();
    expect(cacheHeaders).toEqual({ Pragma: 'no-cache' });
  });
});
