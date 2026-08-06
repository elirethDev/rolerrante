/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { actions } from './+page.server';

type ActionFn = (...args: unknown[]) => Promise<any>;
const joinFn = actions.join as unknown as ActionFn;
const leaveFn = actions.leave as unknown as ActionFn;

interface Fixture {
  participant?: Record<string, unknown> | null;
  participationError?: unknown;
  inserted?: Array<Record<string, unknown>>;
  deletedIds?: Array<string>;
  deleteError?: unknown;
}

function makeSupabase(f: Fixture) {
  const from = (table: string) => {
    let mode: 'read' | 'delete' | 'insert' = 'read';
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        if (mode === 'delete' && col === 'id') (f.deletedIds ??= []).push(String(val));
        return builder;
      },
      single: () =>
        Promise.resolve({ data: f.participant ?? null, error: f.participationError ?? null }),
      delete: () => {
        mode = 'delete';
        return builder;
      },
      insert: (row: Record<string, unknown>) => {
        mode = 'insert';
        (f.inserted ??= []).push(row);
        return builder;
      },
      then: (res: (...args: unknown[]) => void, rej: (...args: unknown[]) => void) =>
        Promise.resolve({ data: null, error: f.deleteError ?? null }).then(res, rej),
    };
    return builder;
  };
  return {
    from,
    get inserted() {
      return f.inserted;
    },
    get deletedIds() {
      return f.deletedIds;
    },
  };
}

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role = 'rolero', userId = 'u1') =>
  ({ supabase, user: { id: userId }, profile: { id: userId, role } }) as never;

const makeGuestLocals = (supabase: ReturnType<typeof makeSupabase>) =>
  ({ supabase, user: null, profile: null }) as never;

const makeLeaveEvent = (locals: ReturnType<typeof makeLocals>) =>
  ({ locals, params: { id: 'evt-1' }, url: new URL('http://localhost/eventos/evt-1') }) as never;

const makeJoinEvent = (locals: ReturnType<typeof makeLocals>, characterId = 'char-1') =>
  ({
    locals,
    params: { id: 'evt-1' },
    url: new URL('http://localhost/eventos/evt-1'),
    request: new Request('http://localhost/eventos/evt-1', {
      method: 'POST',
      body: new URLSearchParams({ character_id: characterId }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as never;

describe('eventos/[id] leave action (SEC-14)', () => {
  it('deletes the player participation row and redirects', async () => {
    const supabase = makeSupabase({
      participant: { id: 'part-1', character: { id: 'char-1', player_id: 'u1' } },
    });
    // Hard to observe the eq chain from the fluent mock; instead assert behavior:
    const err = await leaveFn(makeLeaveEvent(makeLocals(supabase))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    // The mock only records the delete id when deleteError is present; use a
    // dedicated error-mock below for mutation assertions.
  });

  it('records the own participation DELETE on the mock chain', async () => {
    const supabase = makeSupabase({
      participant: { id: 'part-1', character: { id: 'char-1', player_id: 'u1' } },
      deleteError: null,
    });
    const err = await leaveFn(makeLeaveEvent(makeLocals(supabase))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(supabase.deletedIds ?? []).toContain('part-1');
  });

  it('no-ops (still redirects) when the player has no participation row', async () => {
    const supabase = makeSupabase({ participant: null, deleteError: null });
    const err = await leaveFn(makeLeaveEvent(makeLocals(supabase))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(supabase.deletedIds ?? []).toHaveLength(0);
  });

  it('routes guests to /login before any delete', async () => {
    const supabase = makeSupabase({ participant: { id: 'part-1' }, deleteError: null });
    const err = await leaveFn(makeLeaveEvent(makeGuestLocals(supabase))).then(
      () => null,
      (e: { status?: number; location?: string }) => e,
    );
    expect(err?.status).toBe(303);
    expect((err as { location?: string }).location).toContain('/login');
    expect(supabase.deletedIds ?? []).toHaveLength(0);
  });
});

describe('eventos/[id] join action', () => {
  it('inserts the participant row for the chosen character and redirects', async () => {
    const supabase = makeSupabase({});
    const err = await joinFn(makeJoinEvent(makeLocals(supabase))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(supabase.inserted ?? []).toHaveLength(1);
    expect(supabase.inserted?.[0]).toMatchObject({ event_id: 'evt-1', character_id: 'char-1' });
  });

  it('fails with 400 when no character is selected', async () => {
    const supabase = makeSupabase({});
    const res = await joinFn(makeJoinEvent(makeLocals(supabase), ''));
    expect(res.status).toBe(400);
    expect(supabase.inserted ?? []).toHaveLength(0);
  });

  it('routes guests to /login before any insert', async () => {
    const supabase = makeSupabase({});
    const err = await joinFn(makeJoinEvent(makeGuestLocals(supabase))).then(
      () => null,
      (e: { status?: number; location?: string }) => e,
    );
    expect(err?.status).toBe(303);
    expect((err as { location?: string }).location).toContain('/login');
    expect(supabase.inserted ?? []).toHaveLength(0);
  });
});
