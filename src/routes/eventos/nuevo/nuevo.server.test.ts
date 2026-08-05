/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load, actions } from './+page.server';

vi.mock('$lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn(async () => true),
}));

import { verifyTurnstileToken } from '$lib/turnstile';

type Handler = (...args: unknown[]) => void;

interface Fixture {
  inserted?: Array<Record<string, unknown>>;
  insertError?: unknown;
  events?: Array<{ id: string }>;
}

function makeSupabase(f: Fixture) {
  const from = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: () => builder,
      single: () => {
        if (table === 'events' && f.inserted?.length) {
          const row = f.inserted[f.inserted.length - 1];
          return Promise.resolve({
            data: { id: row.id, ...row },
            error: f.insertError ?? null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      insert: (row: Record<string, unknown>) => {
        if (table === 'events') {
          (f.inserted ??= []).push({ id: 'evt-new', ...row });
          return builder; // .select('id').single()
        }
        return Promise.resolve({ data: null, error: null });
      },
      then: (res: Handler, rej: Handler) =>
        Promise.resolve({ data: null, error: null }).then(res, rej),
    };
    return builder;
  };
  return { from };
}

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role: string, userId = 'u1') =>
  ({ supabase, user: { id: userId }, profile: { id: userId, role } }) as never;

const makeGuestLocals = (supabase: ReturnType<typeof makeSupabase>) =>
  ({ supabase, user: null, profile: null }) as never;

const makeLoad = (locals: ReturnType<typeof makeLocals>) =>
  ({ locals }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, body: string) =>
  ({
    locals,
    url: new URL('http://localhost/eventos/nuevo'),
    request: new Request('http://localhost/eventos/nuevo', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as never;

const formBody = (fields: Record<string, string>) =>
  new URLSearchParams({ 'cf-turnstile-response': 'token', ...fields }).toString();

const validBody = () =>
  formBody({
    title: 'Noche en el Bosque Sombrío',
    type: 'evento',
    starts_at: '2026-03-01T19:00',
    ends_at: '2026-03-01T23:00',
    max_players: '4',
    location: 'Bosque Sombrío',
    description: '<p>Un evento comunitario.</p>',
  });

const expectRedirectFor = async (fn: (...args: unknown[]) => Promise<any>, locals: ReturnType<typeof makeLocals>) => {
  const err = await fn(makeEvent(locals, validBody())).then(
    () => {
      throw new Error('expected a redirect to be thrown');
    },
    (e: { status?: number }) => e,
  );
  expect(err.status).toBe(303);
  return err;
};

const expectThrownStatus = async (
  fn: (...args: unknown[]) => Promise<any>,
  locals: ReturnType<typeof makeLocals>,
  status: number,
) => {
  const err = await fn(makeEvent(locals, validBody())).then(
    () => {
      throw new Error(`expected an error with status ${status} to be thrown`);
    },
    (e: { status?: number }) => e,
  );
  expect(err.status).toBe(status);
  return err;
};

const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

describe('eventos/nuevo load (EVT-PUB-01)', () => {
  it('allows an authenticated rolero to load the new-event form', async () => {
    const supabase = makeSupabase({});
    const data = await loadFn(makeLoad(makeLocals(supabase, 'rolero')));
    expect(data).toEqual({});
  });

  it('allows an authenticated gm/admin to load the form', async () => {
    const supabase = makeSupabase({});
    await expect(loadFn(makeLoad(makeLocals(supabase, 'gm')))).resolves.toEqual({});
    await expect(loadFn(makeLoad(makeLocals(supabase, 'admin')))).resolves.toEqual({});
  });

  it('redirects a guest to /login (303) on load', async () => {
    const supabase = makeSupabase({});
    await expectThrownStatus(loadFn, makeGuestLocals(supabase), 303);
  });
});

describe('eventos/nuevo default action (EVT-PUB-02)', () => {
  beforeEach(() => {
    vi.mocked(verifyTurnstileToken).mockClear();
  });

  it('lets an authenticated rolero publish an event with status publicado', async () => {
    const f: Fixture = {};
    const supabase = makeSupabase(f);
    const err = await expectRedirectFor(defaultFn, makeLocals(supabase, 'rolero'));
    expect(String(err.location)).toBe('/eventos/evt-new');
    expect(f.inserted).toHaveLength(1);
    const row = f.inserted![0];
    expect(row.creator_id).toBe('u1');
    expect(row.status).toBe('publicado');
    expect(row.title).toBe('Noche en el Bosque Sombrío');
    expect(row.type).toBe('evento');
  });

  it('rejects creation without title or starts_at (400)', async () => {
    const f: Fixture = {};
    const supabase = makeSupabase(f);
    const res = await defaultFn(
      makeEvent(makeLocals(supabase, 'rolero'), formBody({ title: 'Solo título' })),
    );
    expect(res.status).toBe(400);
    expect((res as { data: { message: string } }).data.message).toContain('Título');
    expect(f.inserted).toBeUndefined();
  });

  it('fails 400 with a security message when the Turnstile token is invalid', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);
    const f: Fixture = {};
    const supabase = makeSupabase(f);
    const res = await defaultFn(makeEvent(makeLocals(supabase, 'rolero'), validBody()));
    expect(res.status).toBe(400);
    expect((res as { data: { message: string } }).data.message).toContain('Verificación');
    expect(f.inserted).toBeUndefined();
  });

  it('fails 400 with the DB error message when the insert fails', async () => {
    const f: Fixture = { insertError: { message: 'duplicate key' } };
    const supabase = makeSupabase(f);
    const res = await defaultFn(makeEvent(makeLocals(supabase, 'rolero'), validBody()));
    expect(res.status).toBe(400);
    expect((res as { data: { message: string } }).data.message).toBe('duplicate key');
  });

  it('redirects a guest to /login (303) before any mutation', async () => {
    const f: Fixture = {};
    const supabase = makeSupabase(f);
    await expectThrownStatus(defaultFn, makeGuestLocals(supabase), 303);
    expect(f.inserted).toBeUndefined();
  });

  it('still allows gm and admin to publish', async () => {
    for (const role of ['gm', 'admin']) {
      const f: Fixture = {};
      const supabase = makeSupabase(f);
      const err = await expectRedirectFor(defaultFn, makeLocals(supabase, role));
      expect(String(err.location)).toBe('/eventos/evt-new');
    }
  });
});
