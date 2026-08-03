/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, vi, type Mock } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { load, actions } from './+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

type SingleResult = { data: unknown; error: unknown } | null;
type Handler = (...args: unknown[]) => void;

function makeSupabase(fixture: {
  thread?: SingleResult;
  posts?: unknown[];
  sectionPerms?: unknown[];
  threadPerms?: unknown[];
  updateThread?: Mock;
  updatePost?: Mock;
  logAudit?: Mock;
}) {
  const from = (table: string) => {
    const selected: string[] = [];
    const b: Record<string, unknown> = {
      select: (fields: string) => {
        selected.push(fields);
        return b;
      },
      eq: () => b,
      order: () => b,
      or: () => b,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (res: Handler, rej: Handler) => {
        let data: unknown;
        if (table === 'posts') data = fixture.posts ?? [];
        else if (table === 'section_permissions') data = fixture.sectionPerms ?? [];
        else if (table === 'thread_permissions') data = fixture.threadPerms ?? [];
        else data = [];
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
      single: () => Promise.resolve(fixture.thread ?? null),
      update: (obj: Record<string, unknown>) => {
        if (table === 'threads' && fixture.updateThread) fixture.updateThread(obj);
        if (table === 'posts' && fixture.updatePost) fixture.updatePost(obj);
        const result = { data: null, error: null };
        return {
          eq: () => ({
            then: (res: Handler, rej: Handler) => Promise.resolve(result).then(res, rej),
          }),
        };
      },
    };
    return b;
  };
  return {
    from,
    rpc: (name: string, args: Record<string, unknown>) => {
      if (name === 'log_audit' && fixture.logAudit) fixture.logAudit(args);
      return Promise.resolve({ data: null, error: null });
    },
  };
}

const makeThread = (p: Partial<Record<string, unknown>> = {}) => ({
  id: 't1',
  category_id: 'c1',
  content_type: 'debate',
  title: 'Hilo',
  body: '<p>abre</p>',
  author_id: 'u1',
  status: 'abierto',
  is_locked: false,
  ...p,
});

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role = 'rolero', userId = 'u1') =>
  ({ supabase, user: { id: userId }, profile: { id: userId, role } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, body = ''): RequestEvent =>
  ({
    locals,
    params: { threadId: 't1', postId: '' },
    request: new Request('http://localhost/foro/t1/editar', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as unknown as RequestEvent;

const expectError = (fn: () => Promise<unknown>, status: number) =>
  fn().then(
    () => {
      throw new Error('expected an http-error to be thrown');
    },
    (e: { status?: number }) => {
      expect(e.status).toBe(status);
    },
  );

describe('editar route load()', () => {
  it('throws 404 when thread not found', async () => {
    const supabase = makeSupabase({ thread: { data: null, error: { message: 'x' } } });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase)) as never), 404);
  });

  it('throws 403 when a non-owner tries to edit', async () => {
    const supabase = makeSupabase({ thread: { data: makeThread({ author_id: 'u999' }), error: null } });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1')) as never), 403);
  });

  it('owner can load the edit form', async () => {
    const supabase = makeSupabase({ thread: { data: makeThread(), error: null } });
    const result = await loadFn(makeEvent(makeLocals(supabase)) as never);
    expect(result.thread.title).toBe('Hilo');
    expect(result.isOwner).toBe(true);
  });
});

describe('editar route default action', () => {
  it('updates thread body+title with edited_by/edited_at and logs editar_post', async () => {
    const updateThread = vi.fn();
    const logAudit = vi.fn();
    const supabase = makeSupabase({
      thread: { data: makeThread(), error: null },
      updateThread,
      logAudit,
    });
    await defaultFn(makeEvent(makeLocals(supabase), 'title=Título nuevo&content=<p>nuevo cuerpo</p>')).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e: { status?: number; location?: string }) => {
        expect(e.status).toBe(303);
        expect(e.location).toBe('/foro/t1');
      },
    );
    expect(updateThread).toHaveBeenCalledTimes(1);
    const updateArg = updateThread.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.title).toBe('Título nuevo');
    expect(updateArg.body).toBe('<p>nuevo cuerpo</p>');
    expect(updateArg.edited_by).toBe('u1');
    expect(updateArg.edited_at).toBeTruthy();
    expect(logAudit).toHaveBeenCalledWith({
      p_action: 'editar_post',
      p_entity_type: 'thread',
      p_entity_id: 't1',
      p_details: {
        changes: [
          { field: 'title', old: 'Hilo', new: 'Título nuevo' },
          { field: 'body', old: '<p>abre</p>', new: '<p>nuevo cuerpo</p>' },
        ],
      },
    });
  });

  it('fails 400 when content is empty', async () => {
    const supabase = makeSupabase({ thread: { data: makeThread(), error: null } });
    const res = await defaultFn(makeEvent(makeLocals(supabase), 'title=T&content='));
    expect(res.status).toBe(400);
  });
});
