/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, vi } from 'vitest';
import { actions } from './+page.server';

// The nuevo action verifies a Cloudflare Turnstile token; in the unit test the
// CAPTCHA is mocked as always-valid so the avatar_url validation path is the
// thing under test.
vi.mock('$lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn(async () => true),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

type Handler = (...args: unknown[]) => void;

interface Fixture {
  settings?: unknown;
  inserted?: Array<Record<string, unknown>>;
  insertError?: unknown;
}

function makeSupabase(f: Fixture) {
  const from = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      single: () => {
        if (table === 'settings') {
          return Promise.resolve({ data: f.settings ?? { value: 25 }, error: null });
        }
        if (table === 'characters' && f.inserted?.length) {
          return Promise.resolve({ data: f.inserted[f.inserted.length - 1], error: f.insertError ?? null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      insert: (row: Record<string, unknown>) => {
        if (table === 'characters') {
          (f.inserted ??= []).push({ id: 'char-1', ...row });
          return builder; // .select('id').single()
        }
        // character_skills insert has no chain
        return Promise.resolve({ data: null, error: null });
      },
      then: (res: Handler, rej: Handler) =>
        Promise.resolve({ data: [], error: null }).then(res, rej),
    };
    return builder;
  };
  return { from };
}

const makeLocals = (supabase: ReturnType<typeof makeSupabase>) =>
  ({ supabase, user: { id: 'u1' }, profile: { id: 'u1', role: 'rolero' } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, body = '') =>
  ({
    locals,
    params: {},
    request: new Request('http://localhost/personajes/nuevo', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
    url: new URL('http://localhost/personajes/nuevo'),
  }) as never;

const formBody = (fields: Record<string, string>) =>
  new URLSearchParams({ ...fields, 'cf-turnstile-response': 'token' }).toString();

// Valid base body (name + race + attrs all valid) so only avatar_url differs.
const baseBody = (avatarUrl: string) =>
  formBody({
    name: 'Aragorn',
    race_id: 'r1',
    age: '87',
    sex: 'Hombre',
    physical_description: 'Desc',
    mana_source: 'I',
    attr_fis: '5',
    attr_des: '5',
    attr_int: '5',
    attr_per: '5',
    attr_esp: '5',
    avatar_url: avatarUrl,
  });

describe('personajes/nuevo default action — avatar_url validation (REQ-CAV-01.2/REQ-CFD-03.2)', () => {
  it('saves a valid https avatar_url on the new ficha', async () => {
    const f: Fixture = {};
    const supabase = makeSupabase(f);
    const err = await defaultFn(makeEvent(makeLocals(supabase), baseBody('https://img.example.com/a.png'))).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e: { status?: number }) => e,
    );
    expect(err.status).toBe(303);
    expect(f.inserted?.[0].avatar_url).toBe('https://img.example.com/a.png');
  });

  it('rejects a javascript: avatar_url with 400 and does not insert', async () => {
    const f: Fixture = {};
    const supabase = makeSupabase(f);
    const res = await defaultFn(makeEvent(makeLocals(supabase), baseBody('javascript:alert(1)')));
    expect(res.status).toBe(400);
    expect(f.inserted).toBeUndefined();
  });

  it('saves avatar_url as null when the field is cleared', async () => {
    const f: Fixture = {};
    const supabase = makeSupabase(f);
    const err = await defaultFn(makeEvent(makeLocals(supabase), baseBody(''))).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e: { status?: number }) => e,
    );
    expect(err.status).toBe(303);
    expect(f.inserted?.[0].avatar_url).toBeNull();
  });
});
