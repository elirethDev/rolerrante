/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { actions } from './+page.server';

type Handler = (...args: unknown[]) => void;

interface SessionFixture {
  events?: Array<{ id: string; creator_id: string }>;
  existingSessions?: Array<Record<string, unknown>>;
  inserted?: Array<Record<string, unknown>>;
  updated?: Array<{ id: string; patch: Record<string, unknown> }>;
  deleted?: Array<{ id: string }>;
  audit?: { name: string; args: Record<string, unknown> }[];
  dbError?: unknown;
}

function makeSupabase(f: SessionFixture) {
  const from = (table: string) => {
    let entityId: string | undefined;
    let mutation: { kind: 'update' | 'delete'; patch?: Record<string, unknown> } | undefined;
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: (col: string, val: unknown) => {
        if (col === 'id') entityId = String(val);
        return builder;
      },
      or: () => builder,
      maybeSingle: () => {
        if (table === 'events') {
          const ev = f.events?.find((e) => e.id === entityId) ?? f.events?.[0];
          return Promise.resolve({ data: ev ?? null, error: null });
        }
        if (table === 'event_sessions') {
          const s =
            f.existingSessions?.find((x) => String(x.id) === entityId) ??
            f.existingSessions?.[0] ??
            null;
          return Promise.resolve({ data: s ?? null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      single: () => {
        if (table === 'event_sessions' && f.inserted?.length) {
          return Promise.resolve({
            data: f.inserted[f.inserted.length - 1],
            error: f.dbError ?? null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      insert: (row: Record<string, unknown>) => {
        (f.inserted ??= []).push({ id: `session-${(f.inserted?.length ?? 0) + 1}`, ...row });
        return builder;
      },
      update: (patch: Record<string, unknown>) => {
        mutation = { kind: 'update', patch };
        return builder;
      },
      delete: () => {
        mutation = { kind: 'delete' };
        return builder;
      },
      then: (res: Handler, rej: Handler) => {
        if (mutation?.kind === 'update') (f.updated ??= []).push({ id: entityId!, patch: mutation.patch! });
        if (mutation?.kind === 'delete') (f.deleted ??= []).push({ id: entityId! });
        return Promise.resolve({ data: null, error: f.dbError ?? null }).then(res, rej);
      },
    };
    return builder;
  };
  return {
    from,
    audit: (f.audit ??= []),
    get inserted() {
      return f.inserted;
    },
    get updated() {
      return f.updated;
    },
    get deleted() {
      return f.deleted;
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      f.audit!.push({ name, args });
      return Promise.resolve({ data: null, error: null });
    },
  };
}

type ActionFn = (...args: unknown[]) => Promise<any>;
const createFn = actions.createSession as unknown as ActionFn;
const updateFn = actions.updateSession as unknown as ActionFn;
const deleteFn = actions.deleteSession as unknown as ActionFn;

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  role: string,
  userId = 'u1',
) =>
  ({
    supabase,
    user: { id: userId },
    profile: { id: userId, role },
  }) as never;

const makeGuestLocals = (supabase: ReturnType<typeof makeSupabase>) =>
  ({
    supabase,
    user: null,
    profile: null,
  }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, body = '') =>
  ({
    locals,
    params: { id: 'evt-1' },
    url: new URL('http://localhost/eventos/evt-1'),
    request: new Request('http://localhost/eventos/evt-1', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as never;

const formBody = (fields: Record<string, string>) => new URLSearchParams(fields).toString();
const ownEvent = { id: 'evt-1', creator_id: 'u1' };

const expectRedirect = async (fn: ActionFn, locals: ReturnType<typeof makeLocals>, body = '') => {
  const err = await fn(makeEvent(locals, body)).then(
    () => {
      throw new Error('expected a redirect to be thrown');
    },
    (e: { status?: number }) => e,
  );
  expect(err.status).toBe(303);
  return err;
};

const expectThrown = async (fn: ActionFn, locals: ReturnType<typeof makeLocals>, status: number, body = '') => {
  const err = await fn(makeEvent(locals, body)).then(
    () => {
      throw new Error('expected an error to be thrown');
    },
    (e: { status?: number }) => e,
  );
  expect(err.status).toBe(status);
  return err;
};

describe('eventos/[id] createSession action', () => {
  it('allows a GM to create a session and audits with log_audit', async () => {
    const supabase = makeSupabase({ events: [ownEvent] });
    await expectRedirect(
      createFn,
      makeLocals(supabase, 'gm', 'gm1'),
      formBody({ session_date: '2026-03-01', title: 'Bosque Sombrío', counts_as_masteo: 'on' }),
    );
    expect(supabase.inserted).toHaveLength(1);
    const row = supabase.inserted![0];
    expect(row.event_id).toBe('evt-1');
    expect(row.session_date).toBe('2026-03-01');
    expect(row.title).toBe('Bosque Sombrío');
    expect(row.summary).toBeNull();
    expect(row.counts_as_masteo).toBe(true);
    expect(supabase.audit).toEqual([
      {
        name: 'log_audit',
        args: {
          p_action: 'editar',
          p_entity_type: 'event_session',
          p_entity_id: 'session-1',
          p_details: {
            event_id: 'evt-1',
            session_date: '2026-03-01',
            title: 'Bosque Sombrío',
            summary: null,
            counts_as_masteo: true,
          },
        },
      },
    ]);
  });

  it('allows the event creator to create a session', async () => {
    const supabase = makeSupabase({ events: [ownEvent] });
    await expectRedirect(
      createFn,
      makeLocals(supabase, 'rolero'),
      formBody({ session_date: '2026-03-05' }),
    );
    expect(supabase.inserted).toHaveLength(1);
  });

  it('denies a non-owner rolero with 403', async () => {
    const supabase = makeSupabase({ events: [{ id: 'evt-1', creator_id: 'other' }] });
    await expectThrown(
      createFn,
      makeLocals(supabase, 'rolero'),
      403,
      formBody({ session_date: '2026-03-05' }),
    );
    expect(supabase.inserted).toBeUndefined();
  });

  it('redirects a guest to login (303) before any mutation', async () => {
    const supabase = makeSupabase({ events: [ownEvent] });
    await expectThrown(
      createFn,
      makeGuestLocals(supabase),
      303,
      formBody({ session_date: '2026-03-05' }),
    );
    expect(supabase.inserted).toBeUndefined();
  });

  it('throws 404 when the event does not exist', async () => {
    const supabase = makeSupabase({ events: [] });
    await expectThrown(
      createFn,
      makeLocals(supabase, 'gm', 'gm1'),
      404,
      formBody({ session_date: '2026-03-05' }),
    );
  });

  it('fails 400 when session_date is missing', async () => {
    const supabase = makeSupabase({ events: [ownEvent] });
    const res = await createFn(
      makeEvent(makeLocals(supabase, 'gm', 'gm1'), formBody({ title: 'Sin fecha' })),
    );
    expect(res.status).toBe(400);
    expect((res as { data: { message: string } }).data.message).toContain('fecha');
    expect(supabase.inserted).toBeUndefined();
  });
});

describe('eventos/[id] updateSession action', () => {
  it('allows a GM to update a session scoped to the event and audits', async () => {
    const supabase = makeSupabase({ events: [ownEvent] });
    await expectRedirect(
      updateFn,
      makeLocals(supabase, 'gm', 'gm1'),
      formBody({ session_id: 's1', session_date: '2026-04-01', title: 'Ruinas', summary: 'Nuevo resumen' }),
    );
    expect(supabase.updated).toHaveLength(1);
    expect(supabase.updated![0].id).toBe('s1');
    expect(supabase.updated![0].patch).toEqual({
      session_date: '2026-04-01',
      title: 'Ruinas',
      summary: 'Nuevo resumen',
      counts_as_masteo: false,
    });
    const auditEntry = supabase.audit?.[0] as unknown as {
      args: { p_entity_id: string; p_details: { event_id: string } };
    };
    expect(auditEntry.args.p_entity_id).toBe('s1');
    expect(auditEntry.args.p_details.event_id).toBe('evt-1');
  });

  it('registers summary null when the field is empty', async () => {
    const supabase = makeSupabase({ events: [ownEvent] });
    await expectRedirect(
      updateFn,
      makeLocals(supabase, 'gm', 'gm1'),
      formBody({ session_id: 's1', session_date: '2026-04-01', title: 'Ruinas' }),
    );
    expect(supabase.updated![0].patch.summary).toBeNull();
  });

  it('denies a non-owner rolero with 403', async () => {
    const supabase = makeSupabase({ events: [{ id: 'evt-1', creator_id: 'other' }] });
    await expectThrown(
      updateFn,
      makeLocals(supabase, 'rolero'),
      403,
      formBody({ session_id: 's1', session_date: '2026-04-01' }),
    );
    expect(supabase.updated).toBeUndefined();
  });

  it('fails 400 when session_id is missing', async () => {
    const supabase = makeSupabase({ events: [ownEvent] });
    const res = await updateFn(
      makeEvent(makeLocals(supabase, 'gm', 'gm1'), formBody({ session_date: '2026-04-01' })),
    );
    expect(res.status).toBe(400);
    expect(supabase.updated).toBeUndefined();
  });

  it('fails 400 when session_date is missing', async () => {
    const supabase = makeSupabase({ events: [ownEvent] });
    const res = await updateFn(
      makeEvent(makeLocals(supabase, 'gm', 'gm1'), formBody({ session_id: 's1', title: 'Sin fecha' })),
    );
    expect(res.status).toBe(400);
    expect(supabase.updated).toBeUndefined();
  });
});

describe('eventos/[id] deleteSession action', () => {
  it('allows a GM to delete a session scoped to the event and audits from the deleted row', async () => {
    const supabase = makeSupabase({
      events: [ownEvent],
      existingSessions: [
        {
          id: 's1',
          event_id: 'evt-1',
          session_date: '2026-03-01',
          title: 'Bosque Sombrío',
          summary: null,
          counts_as_masteo: false,
        },
      ],
    });
    await expectRedirect(
      deleteFn,
      makeLocals(supabase, 'gm', 'gm1'),
      formBody({ session_id: 's1' }),
    );
    expect(supabase.deleted).toEqual([{ id: 's1' }]);
    expect(supabase.audit).toEqual([
      {
        name: 'log_audit',
        args: {
          p_action: 'editar',
          p_entity_type: 'event_session',
          p_entity_id: 's1',
          p_details: {
            event_id: 'evt-1',
            session_date: '2026-03-01',
            title: 'Bosque Sombrío',
            summary: null,
            counts_as_masteo: false,
          },
        },
      },
    ]);
  });

  it('denies a non-owner rolero with 403', async () => {
    const supabase = makeSupabase({
      events: [{ id: 'evt-1', creator_id: 'other' }],
      existingSessions: [{ id: 's1', event_id: 'evt-1' }],
    });
    await expectThrown(
      deleteFn,
      makeLocals(supabase, 'rolero'),
      403,
      formBody({ session_id: 's1' }),
    );
    expect(supabase.deleted).toBeUndefined();
  });

  it('fails 404 when the session does not belong to the event', async () => {
    const supabase = makeSupabase({ events: [ownEvent], existingSessions: [] });
    const res = await deleteFn(
      makeEvent(makeLocals(supabase, 'gm', 'gm1'), formBody({ session_id: 'missing' })),
    );
    expect(res.status).toBe(404);
    expect(supabase.deleted).toBeUndefined();
  });
});
