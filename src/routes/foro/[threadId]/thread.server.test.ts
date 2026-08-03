/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load, actions } from './+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const replyFn = actions.reply as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deleteFn = actions.delete as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reportFn = actions.report as unknown as (...args: unknown[]) => Promise<any>;

type Handler = (...args: unknown[]) => void;

interface Fixture {
  thread?: unknown;
  posts?: unknown[];
  sectionPerms?: unknown[];
  threadPerms?: unknown[];
  entity?: unknown;
  insertedPosts?: Array<Record<string, unknown>>;
  maxPostNumber?: number;
  insertError?: unknown;
  audit?: { name: string; args: Record<string, unknown> }[];
  deletedIds?: string[];
  postSingle?: unknown;
  insertRows?: Array<Record<string, unknown>>;
  authUser?: { id: string } | null;
  existingReport?: unknown;
  sanction?: { kind: string; active_until: string | null } | null;
}

// Fluent supabase mock for the thread detail route. Supports:
//   threads:      select('*, author:...').eq(id).single()  -> thread
//   posts:        select().eq(thread_id).order(post_number) -> posts
//   section_perm: select().eq(role).then                    -> sectionPerms
//   thread_perm:  select().eq(thread_id).then               -> threadPerms
//   stories/characters/events: select().eq(id).single()     -> entity
//   posts insert: select().single() -> insertedPosts[last] (allows maxPostNumber)
function makeSupabase(f: Fixture) {
  const from = (table: string) => {
    let deleting = false;
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        if (deleting && table === 'posts') (f.deletedIds ??= []).push(String(val));
        return builder;
      },
      order: () => builder,
      or: () => builder,
      maybeSingle: () => {
        if (table === 'user_sanctions' || table === 'reports') {
          return Promise.resolve({
            data:
              table === 'reports'
                ? (f.existingReport ?? null)
                : (f.sanction ?? null),
            error: null,
          });
        }
        return Promise.resolve({ data: f.thread ?? null, error: null });
      },
      single: () => {
        if (table === 'threads') return Promise.resolve({ data: f.thread ?? null, error: null });
        if (table === 'posts') return Promise.resolve({ data: f.postSingle ?? null, error: null });
        // reports insert read-back: mimic the reporter self-SELECT policy returning the new id.
        if (table === 'reports') {
          const last = (f.insertRows ?? [])[Math.max((f.insertRows?.length ?? 1) - 1, 0)];
          return Promise.resolve({ data: last ? { id: last.id ?? 'rep-new' } : { id: 'rep-new' }, error: null });
        }
        // entity tables
        return Promise.resolve({ data: f.entity ?? null, error: null });
      },
      delete: () => {
        deleting = true;
        return builder;
      },
      then: (res: Handler, rej: Handler) => {
        let data: unknown;
        if (table === 'posts') {
          // emulate .order('post_number', ascending) for posts (route relies on it)
          data = [...(f.posts ?? [])].sort(
            (a, b) => Number((a as { post_number?: number }).post_number) - Number((b as { post_number?: number }).post_number),
          );
        } else if (table === 'section_permissions') data = f.sectionPerms ?? [];
        else if (table === 'thread_permissions') data = f.threadPerms ?? [];
        else data = [];
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
      insert: (row: Record<string, unknown>) => {
        if (table === 'posts') {
          const newRow = { id: `post-${(f.insertedPosts?.length ?? 0) + 1}`, post_number: f.maxPostNumber, ...row };
          (f.insertedPosts ??= []).push(newRow);
        }
        if (table === 'reports') {
          const newRow = { id: `rep-${(f.insertRows?.length ?? 0) + 1}`, ...row };
          (f.insertRows ??= []).push(newRow);
        }
        return builder;
      },
    };
    return builder;
  };
  return {
    from,
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: f.authUser ?? { id: 'u1' } },
          error: null,
        }),
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      (f.audit ??= []).push({ name, args });
      return Promise.resolve({ data: null, error: null });
    },
    fixtures: f,
  };
}

const makeThread = (p: Partial<Record<string, unknown>> = {}) => ({
  id: 't1',
  category_id: 'c1',
  content_type: 'debate',
  title: 'Hilo',
  body: '<p>abre</p>',
  author_id: 'u1',
  linked_entity_type: null,
  linked_entity_id: null,
  status: 'abierto',
  is_locked: false,
  locked_by: null,
  locked_at: null,
  created_at: '2026-08-02T00:00:00Z',
  updated_at: '2026-08-02T00:00:00Z',
  edited_by: null,
  edited_at: null,
  author: { id: 'u1', display_name: 'Autor', username: 'autor' },
  ...p,
});

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role = 'rolero', userId = 'u1') =>
  ({ supabase, user: { id: userId }, profile: { id: userId, role } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, params = { threadId: 't1' }) =>
  ({ locals, params, url: new URL('http://localhost/foro/t1') }) as never;

const expectError = (fn: () => Promise<unknown>, status: number) =>
  fn().then(
    () => {
      throw new Error('expected http error');
    },
    (e: { status?: number }) => {
      expect(e.status).toBe(status);
    },
  );
describe('thread detail load()', () => {
  it('returns posts ordered by post_number asc with locked flag false', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      posts: [
        { id: 'p1', post_number: 2, body: '<p>b</p>', author_id: 'u2', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null, author: { id: 'u2', display_name: 'B', username: 'b' } },
        { id: 'p0', post_number: 1, body: '<p>a</p>', author_id: 'u1', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null, author: { id: 'u1', display_name: 'A', username: 'a' } },
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    // route must order posts by post_number
    const numbers = result.posts.map((p: { post_number: number }) => p.post_number);
    expect(numbers).toEqual([1, 2]);
    expect(result.thread.title).toBe('Hilo');
    expect(result.isLocked).toBe(false);
  });

  it('returns isLocked true and does not block read for a locked thread', async () => {
    const supabase = makeSupabase({ thread: makeThread({ is_locked: true }) });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.isLocked).toBe(true);
    expect(result.thread.title).toBe('Hilo');
  });

  it('joins bridged entity info (name + status) for a linked thread', async () => {
    const supabase = makeSupabase({
      thread: makeThread({
        content_type: 'historia',
        linked_entity_type: 'story',
        linked_entity_id: 'story-9',
        status: 'aprobado',
      }),
      entity: { id: 'story-9', title: 'La saga', status: 'aprobado' },
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.entity).not.toBeNull();
    expect(result.entity.name).toBe('La saga');
    expect(result.entity.status).toBe('aprobado');
  });

  it('flags pendiente thread visible only to owner; staff sees it too', async () => {
    const supabase = makeSupabase({ thread: makeThread({ status: 'pendiente', author_id: 'u1' }) });
    const owner = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1')));
    expect(owner.thread.status).toBe('pendiente');
    expect(owner.isOwner).toBe(true);
  });

  it('throws 404 when thread not found or not visible to guest (pendiente status)', async () => {
    const supabase = makeSupabase({ thread: null });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase, 'pendiente', 'other'))), 404);
  });

  it('denies a suspended user before serving the thread (ENF-03.2)', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const supabase = makeSupabase({
      thread: makeThread(),
      sanction: { kind: 'suspension', active_until: future },
    });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase, 'rolero'))), 303);
  });
});

describe('thread detail reply action', () => {
  const makeReplyEvent = (locals: ReturnType<typeof makeLocals>, content = '<p>respuesta</p>') =>
    ({
      locals,
      params: { threadId: 't1' },
      url: new URL('http://localhost/foro/t1'),
      request: new Request('http://localhost/foro/t1', {
        method: 'POST',
        body: new URLSearchParams({ content }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    }) as never;

  it('appends a post with post_number = max+1 on an open thread', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread({ is_locked: false }),
      posts: [
        { id: 'p1', post_number: 1, body: '<p>a</p>', author_id: 'u1', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null },
        { id: 'p2', post_number: 2, body: '<p>b</p>', author_id: 'u2', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null },
      ],
      insertedPosts: inserted,
    });
    // success = redirect thrown (rejection)
    const err = await replyFn(makeReplyEvent(makeLocals(supabase))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].post_number).toBe(3);
    expect(inserted[0].thread_id).toBe('t1');
    expect(inserted[0].author_id).toBe('u1');
  });

  it('blocks a reply on a locked thread with 403 even for the owner', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({ thread: makeThread({ is_locked: true }), insertedPosts: inserted });
    // fail() resolves with { status, data }
    const res = await replyFn(makeReplyEvent(makeLocals(supabase, 'rolero', 'u1')));
    expect(res.status).toBe(403);
    expect(inserted).toHaveLength(0);
  });

  it('rejects a reply with a bad image url with 400', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({ thread: makeThread({ is_locked: false }), insertedPosts: inserted });
    const res = await replyFn(makeReplyEvent(makeLocals(supabase), '<img src="data:image/png;base64,xxx">'));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });
});

describe('thread detail report action (REQ-MOD-REP-01)', () => {
  const makeReportEvent = (locals: ReturnType<typeof makeLocals>, reason = 'Spam') =>
    ({
      locals,
      params: { threadId: 't1' },
      url: new URL('http://localhost/foro/t1'),
      request: new Request('http://localhost/foro/t1', {
        method: 'POST',
        body: new URLSearchParams({ post_id: 'p1', reason }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    }) as never;

  it('requires auth before reporting (unauthenticated -> redirect to /login)', async () => {
    const supabase = makeSupabase({ thread: makeThread() });
    // No user -> requireAuth throws a 303 redirect to /login.
    const err = await reportFn({
      locals: { supabase, user: null, profile: null },
      params: { threadId: 't1' },
      url: new URL('http://localhost/foro/t1'),
      request: new Request('http://localhost/foro/t1', {
        method: 'POST',
        body: new URLSearchParams({ post_id: 'p1', reason: 'Spam' }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    }).then(
      () => null,
      (e: { status?: number; location?: string }) => e,
    );
    expect(err?.status).toBe(303);
    expect((err as { location?: string })?.location).toContain('/login');
  });

  it('redirects on success and inserts a report attributed to the reporter', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread(),
      insertRows: inserted,
    });
    const err = await reportFn(makeReportEvent(makeLocals(supabase, 'rolero', 'u1'))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ post_id: 'p1', reporter_id: 'u1' });
  });

  it('rejects an empty reason with 400 (REP-01)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({ thread: makeThread(), insertRows: inserted });
    const res = await reportFn(makeReportEvent(makeLocals(supabase, 'rolero', 'u1'), '   '));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it('dedupes an existing open report from the same reporter on the same post', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread(),
      insertRows: inserted,
      existingReport: { id: 'rep-existing' },
    });
    const res = await reportFn(makeReportEvent(makeLocals(supabase, 'rolero', 'u1')));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });
});

describe('thread detail delete action', () => {
  const makeDeleteEvent = (locals: ReturnType<typeof makeLocals>, postId = 'p2') =>
    ({
      locals,
      params: { threadId: 't1', postId },
      url: new URL('http://localhost/foro/t1'),
      request: new Request('http://localhost/foro/t1', {
        method: 'POST',
        body: new URLSearchParams({ post_id: postId }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    }) as never;

  it('deletes an own post, logs eliminar_post, without renumbering', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      postSingle: { id: 'p2', post_number: 2, author_id: 'u1', thread_id: 't1', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null, body: '<p>b</p>' },
    });
    const err = await deleteFn(makeDeleteEvent(makeLocals(supabase, 'rolero', 'u1'), 'p2')).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(supabase.fixtures.deletedIds).toContain('p2');
    // audit for eliminar_post
    const audit = supabase.fixtures.audit ?? [];
    expect(audit.some((a) => a.name === 'log_audit')).toBe(true);
    expect(supabase.fixtures.audit?.[0]?.args?.p_action).toBe('eliminar_post');
  });

  it('blocks deleting another user post with 403', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      postSingle: { id: 'p2', post_number: 2, author_id: 'u999', thread_id: 't1', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null, body: '<p>b</p>' },
    });
    const res = await deleteFn(makeDeleteEvent(makeLocals(supabase, 'rolero', 'u1'), 'p2'));
    expect(res.status).toBe(403);
    expect(supabase.fixtures.deletedIds ?? []).toHaveLength(0);
  });
});
