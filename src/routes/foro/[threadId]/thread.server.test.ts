/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load, actions } from './+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const replyFn = actions.reply as unknown as (...args: unknown[]) => Promise<any>;

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
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => {
        // posts ordering is tracked via order()
        return builder;
      },
      order: () => builder,
      maybeSingle: () => Promise.resolve({ data: f.thread ?? null, error: null }),
      single: () => {
        if (table === 'threads' || table === 'posts') {
          const item = f.posts?.length ? f.posts[f.posts.length - 1] : f.thread;
          if (table === 'posts' && f.insertedPosts?.length) {
            const last = f.insertedPosts[f.insertedPosts.length - 1];
            return Promise.resolve({ data: last, error: f.insertError ?? null });
          }
          return Promise.resolve({ data: table === 'threads' ? f.thread ?? null : item ?? null, error: null });
        }
        // entity tables
        return Promise.resolve({ data: f.entity ?? null, error: null });
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
        return builder;
      },
    };
    return builder;
  };
  return {
    from,
    rpc: (name: string, args: Record<string, unknown>) => {
      (f.audit ??= []).push({ name, args });
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
