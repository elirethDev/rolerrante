/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { actions } from './+page.server';

type ActionFn = (...args: unknown[]) => Promise<any>;
const setRoleFn = actions.setRole as unknown as ActionFn;

interface Fixture {
  rpcCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  rpcError?: unknown;
  updates?: Array<{ table: string; patch: Record<string, unknown> }>;
}

function makeSupabase(f: Fixture) {
  const from = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: () => builder,
      rpc: () => builder,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (res: (...args: unknown[]) => void, rej: (...args: unknown[]) => void) =>
        Promise.resolve({ data: [], error: null }).then(res, rej),
      update: (patch: Record<string, unknown>) => {
        (f.updates ??= []).push({ table, patch });
        return builder;
      },
    };
    return builder;
  };
  return {
    from,
    rpc: (name: string, args: Record<string, unknown>) => {
      (f.rpcCalls ??= []).push({ name, args });
      return Promise.resolve({ data: null, error: f.rpcError ?? null });
    },
    fixtures: f,
  };
}

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role: string, userId = 'admin-1') =>
  ({ supabase, user: { id: userId }, profile: { id: userId, role } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, userId = 'u2', role = 'gm') =>
  ({
    locals,
    request: new Request('http://localhost/admin/usuarios', {
      method: 'POST',
      body: new URLSearchParams({ user_id: userId, role }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
    url: new URL('http://localhost/admin/usuarios'),
  }) as never;

describe('admin/usuarios setRole action (SEC-05)', () => {
  it('routes the role change through the change_role RPC instead of a raw profiles UPDATE', async () => {
    const supabase = makeSupabase({});
    const err = await setRoleFn(makeEvent(makeLocals(supabase, 'admin'))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303); // success = redirect
    expect(supabase.fixtures.rpcCalls ?? []).toHaveLength(1);
    expect(supabase.fixtures.rpcCalls?.[0].name).toBe('change_role');
    expect(supabase.fixtures.rpcCalls?.[0].args).toEqual({ p_user_id: 'u2', p_new_role: 'gm' });
    // The old direct table update must be gone.
    expect(supabase.fixtures.updates ?? []).toHaveLength(0);
  });

  it('rejects a non-admin with 403 without calling the RPC', async () => {
    const supabase = makeSupabase({});
    const err = await setRoleFn(makeEvent(makeLocals(supabase, 'rolero'))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(403);
    expect(supabase.fixtures.rpcCalls ?? []).toHaveLength(0);
  });

  it('surfaces an RPC error as a 400 form failure', async () => {
    const supabase = makeSupabase({ rpcError: { message: 'Rol inválido' } });
    const res = await setRoleFn(makeEvent(makeLocals(supabase, 'admin')));
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Rol inválido');
  });
});
