/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, vi, type Mock } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { load, actions } from './+page.server';

// Cast the SvelteKit-typed exports to loose versions for direct unit driving.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requestReviewFn = actions.request_review as unknown as (...args: unknown[]) => Promise<any>;

// ---------------------------------------------------------------------------
// Minimal chainable supabase mock for the character edit route. `from('characters')`
// supports `.select().eq().single()` (load + ownership check) and `.update().eq()`
// (the save), mirroring the stories editar.server.test.ts factory. `rpc()` mocks
// the request_character_review SECURITY DEFINER call.
// ---------------------------------------------------------------------------
type SingleResult = { data: unknown; error: unknown } | null;

export function makeSupabase(fixture: {
  loadCharacter?: SingleResult;
  racesList?: unknown[];
  updateCharacter?: Mock;
  rpc?: Mock;
  rpcError?: unknown;
}) {
  const rpc = (fn: string, args: unknown) => {
    if (fixture.rpc) fixture.rpc(fn, args);
    return Promise.resolve({ data: null, error: fixture.rpcError ?? null });
  };
  const from = (table: string) => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      order: () => b,
      single: () => Promise.resolve(fixture.loadCharacter ?? null),
      update: (obj: Record<string, unknown>) => {
        if (fixture.updateCharacter) fixture.updateCharacter(obj);
        const result = { data: null, error: null };
        return {
          eq: () => ({
            then: (res: (...args: unknown[]) => void, rej: (...args: unknown[]) => void) =>
              Promise.resolve(result).then(res, rej),
          }),
        };
      },
      // list queries (races) resolve to an array
      then: (res: (...args: unknown[]) => void, rej: (...args: unknown[]) => void) =>
        Promise.resolve({ data: table === 'races' ? fixture.racesList ?? [] : [], error: null }).then(res, rej),
    };
    return b;
  };
  return { from, rpc };
}

const makeUser = (id = 'user-1') => ({ id } as never);

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  user = makeUser(),
  role: 'player' | 'gm' | 'admin' = 'player',
) => ({
  supabase,
  user,
  profile: { id: 'user-1', role },
} as never);

const makeEvent = (
  locals: ReturnType<typeof makeLocals>,
  params = { id: 'char-1' },
  body = 'name=Aragorn&race_id=r1&age=87&sex=Hombre&mana_source=I&status=pendiente&attr_fis=5&attr_des=5&attr_int=5&attr_per=5&attr_esp=5',
): RequestEvent =>
  ({
    locals,
    params,
    request: new Request('http://localhost/personajes/char-1/editar', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as unknown as RequestEvent;

const expectError = (fn: () => Promise<unknown>, status: number) => {
  return fn().then(
    () => {
      throw new Error('expected an http-error to be thrown');
    },
    (e) => {
      expect((e as { status?: number }).status).toBe(status);
    },
  );
};

describe('editar route load() — ownership (REQ-CFD-01.1/01.3)', () => {
  it('throws 403 for a non-owner, non-staff player', async () => {
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-999' }, error: null },
    });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase)) as never), 403);
  });

  it('loads the character for the owner', async () => {
    const supabase = makeSupabase({
      loadCharacter: {
        data: { id: 'char-1', player_id: 'user-1', name: 'Aragorn' },
        error: null,
      },
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)) as never);
    expect(result.character.id).toBe('char-1');
    expect(result.isStaff).toBe(false);
  });

  it.each(['gm', 'admin'] as const)(
    'lets staff (%s) load another player character',
    async (role) => {
      const supabase = makeSupabase({
        loadCharacter: { data: { id: 'char-1', player_id: 'user-999', name: 'Legolas' }, error: null },
      });
      const result = await loadFn(makeEvent(makeLocals(supabase, makeUser(), role)) as never);
      expect(result.character.id).toBe('char-1');
      expect(result.isStaff).toBe(true);
    },
  );
});

describe('editar route default action — draft state machine (REQ-CFD-02.1/02.2/02.3)', () => {
  it('fails 403 when a non-owner player saves', async () => {
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-999' }, error: null },
    });
    const res = await defaultFn(makeEvent(makeLocals(supabase)) as never);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid avatar_url with 400 and does not update', async () => {
    const updateCharacter = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-1', review_notes: 'rechazado' }, error: null },
      updateCharacter,
    });
    const res = await defaultFn(
      makeEvent(
        makeLocals(supabase),
        { id: 'char-1' },
        'name=Aragorn&race_id=r1&age=87&sex=Hombre&mana_source=I&status=pendiente&attr_fis=5&attr_des=5&attr_int=5&attr_per=5&attr_esp=5&avatar_url=javascript:alert(1)',
      ) as never,
    );
    expect(res.status).toBe(400);
    expect(updateCharacter).not.toHaveBeenCalled();
  });

  it('saves as pendiente, clears review fields, preserves review_notes', async () => {
    const updateCharacter = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: {
        data: { id: 'char-1', player_id: 'user-1', review_notes: 'rechazado' },
        error: null,
      },
      updateCharacter,
    });
    await defaultFn(makeEvent(makeLocals(supabase)) as never).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e) => {
        expect((e as { status?: number }).status).toBe(303);
        expect((e as { location?: string }).location).toBe('/personajes/char-1');
      },
    );
    const updateArg = updateCharacter.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe('pendiente');
    expect(updateArg.reviewed_by).toBeNull();
    expect(updateArg.reviewed_at).toBeNull();
    expect(updateArg).not.toHaveProperty('review_notes');
  });

  it('saves as borrador when the player selects draft', async () => {
    const updateCharacter = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-1', review_notes: null }, error: null },
      updateCharacter,
    });
    await defaultFn(
      makeEvent(
        makeLocals(supabase),
        { id: 'char-1' },
        'name=Aragorn&race_id=r1&age=87&sex=Hombre&mana_source=I&status=borrador&attr_fis=5&attr_des=5&attr_int=5&attr_per=5&attr_esp=5',
      ) as never,
    ).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e) => {
        expect((e as { status?: number }).status).toBe(303);
      },
    );
    expect(updateCharacter.mock.calls[0][0].status).toBe('borrador');
  });

  it('lets staff save another player character as pendiente', async () => {
    const updateCharacter = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-999', review_notes: 'x' }, error: null },
      updateCharacter,
    });
    await defaultFn(makeEvent(makeLocals(supabase, makeUser(), 'gm')) as never).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      () => {},
    );
    expect(updateCharacter).toHaveBeenCalledTimes(1);
  });
});

describe('editar route request_review action — re-approval loop', () => {
  it('fails 403 for a non-owner, non-staff player and never calls the RPC', async () => {
    const updateCharacter = vi.fn();
    const rpc = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-999', status: 'aprobado' }, error: null },
      updateCharacter,
      rpc,
    });
    const res = await requestReviewFn(makeEvent(makeLocals(supabase)) as never);
    expect(res.status).toBe(403);
    expect(updateCharacter).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails 403 for staff editing another player ficha (owner-scoped RPC)', async () => {
    const updateCharacter = vi.fn();
    const rpc = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-999', status: 'aprobado' }, error: null },
      updateCharacter,
      rpc,
    });
    const res = await requestReviewFn(makeEvent(makeLocals(supabase, makeUser(), 'gm')) as never);
    expect(res.status).toBe(403);
    expect(updateCharacter).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('saves content (content columns only) and calls request_character_review, then redirects', async () => {
    const updateCharacter = vi.fn();
    const rpc = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: {
        data: { id: 'char-1', player_id: 'user-1', status: 'aprobado', review_notes: 'visto', reviewed_by: 'gm-1', reviewed_at: '2026-01-01' },
        error: null,
      },
      updateCharacter,
      rpc,
    });
    await requestReviewFn(makeEvent(makeLocals(supabase)) as never).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e) => {
        expect((e as { status?: number }).status).toBe(303);
        expect((e as { location?: string }).location).toBe('/personajes/char-1');
      },
    );

    // content is saved via the owner session, but the review transition is
    // delegated to the SECURITY DEFINER RPC (status/review_* are not owner writes)
    const updateArg = updateCharacter.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.name).toBe('Aragorn');
    expect(updateArg.race_id).toBe('r1');
    expect(updateArg).not.toHaveProperty('status');
    expect(updateArg).not.toHaveProperty('reviewed_by');
    expect(updateArg).not.toHaveProperty('reviewed_at');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('request_character_review');
    expect(rpc.mock.calls[0][1]).toEqual({ p_character_id: 'char-1' });
  });

  it('rejects an invalid avatar_url with 400 and never saves nor calls the RPC', async () => {
    const updateCharacter = vi.fn();
    const rpc = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-1', status: 'aprobado' }, error: null },
      updateCharacter,
      rpc,
    });
    const res = await requestReviewFn(
      makeEvent(
        makeLocals(supabase),
        { id: 'char-1' },
        'name=Aragorn&race_id=r1&age=87&sex=Hombre&mana_source=I&status=pendiente&attr_fis=5&attr_des=5&attr_int=5&attr_per=5&attr_esp=5&avatar_url=javascript:alert(1)',
      ) as never,
    );
    expect(res.status).toBe(400);
    expect(updateCharacter).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails 400 with the RPC message when request_character_review errors', async () => {
    const updateCharacter = vi.fn();
    const rpc = vi.fn();
    const supabase = makeSupabase({
      loadCharacter: { data: { id: 'char-1', player_id: 'user-1', status: 'aprobado' }, error: null },
      updateCharacter,
      rpc,
      rpcError: new Error('boom'),
    });
    const res = await requestReviewFn(makeEvent(makeLocals(supabase)) as never);
    expect(res.status).toBe(400);
    expect(updateCharacter).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
