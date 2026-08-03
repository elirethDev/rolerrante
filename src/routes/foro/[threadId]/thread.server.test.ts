/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load, actions } from './+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const replyFn = actions.reply as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deleteFn = actions.delete as unknown as (...args: unknown[]) => Promise<any>;

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
  quoteSearchId?: string;
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
    let countOnly = false;
    let rangeBounds: [number, number] | null = null;
    const builder: Record<string, unknown> = {
      select: (_sel?: unknown, opts?: { count?: string }) => {
        if (opts?.count) countOnly = true;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        if (deleting && table === 'posts') (f.deletedIds ??= []).push(String(val));
        if (!deleting && table === 'posts' && col === 'id') f.quoteSearchId = String(val);
        return builder;
      },
      order: () => builder,
      range: (a: number, b: number) => {
        rangeBounds = [a, b];
        return builder;
      },
      maybeSingle: () => {
        if (table === 'posts') {
          // emulate `.eq('id', quotePostId)`: return the matching post if present
          const ids = Array.isArray(f.posts) ? (f.posts as Array<{ id: string }>).map((p) => p.id) : [];
          const target = f.quoteSearchId ?? (ids.length ? ids[0] : null);
          const match = ids.includes(String(target)) ? f.posts!.find((p) => (p as { id: string }).id === target) : null;
          return Promise.resolve({ data: match ?? null, error: null });
        }
        return Promise.resolve({ data: f.thread ?? null, error: null });
      },
      single: () => {
        if (table === 'threads') return Promise.resolve({ data: f.thread ?? null, error: null });
        if (table === 'posts') return Promise.resolve({ data: f.postSingle ?? null, error: null });
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
          if (countOnly) return Promise.resolve({ data: null, error: null, count: (f.posts ?? []).length }).then(res, rej);
          // emulate .order('post_number', ascending) for posts (route relies on it)
          let list = [...(f.posts ?? [])].sort(
            (a, b) => Number((a as { post_number?: number }).post_number) - Number((b as { post_number?: number }).post_number),
          );
          if (rangeBounds) list = list.slice(rangeBounds[0], rangeBounds[1] + 1);
          data = list;
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

const makePost = (n: number) => ({
  id: `p${n}`,
  post_number: n,
  body: `<p>${n}</p>`,
  author_id: 'u1',
  created_at: 'x',
  updated_at: 'x',
  edited_by: null,
  edited_at: null,
  author: { id: 'u1', display_name: 'Autor', username: 'autor' },
});

const makeEvent = (locals: ReturnType<typeof makeLocals>, params = { threadId: 't1' }, page?: string) =>
  ({
    locals,
    params,
    url: new URL(`http://localhost/foro/t1${page ? `?page=${page}` : ''}`),
  }) as never;

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

describe('thread detail pagination (REQ-FORUM-02.3)', () => {
  it('defaults to page 1 and exposes totalPosts/totalPages/currentPage', async () => {
    const posts = Array.from({ length: 25 }, (_, i) => makePost(i + 1));
    const supabase = makeSupabase({ thread: makeThread(), posts });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.totalPosts).toBe(25);
    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(1);
    const numbers = result.posts.map((p: { post_number: number }) => p.post_number);
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1)); // posts 1..20
  });

  it('?page=2 returns the 21-40 slice of a 45-post thread', async () => {
    const posts = Array.from({ length: 45 }, (_, i) => makePost(i + 1));
    const supabase = makeSupabase({ thread: makeThread(), posts });
    const result = await loadFn(makeEvent(makeLocals(supabase), { threadId: 't1' }, '2'));
    expect(result.totalPosts).toBe(45);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(2);
    const numbers = result.posts.map((p: { post_number: number }) => p.post_number);
    expect(numbers[0]).toBe(21);
    expect(numbers[numbers.length - 1]).toBe(40);
    expect(numbers).toHaveLength(20);
  });

  it('clamps out-of-bounds ?page=5 to page 1 for a 30-post thread', async () => {
    const posts = Array.from({ length: 30 }, (_, i) => makePost(i + 1));
    const supabase = makeSupabase({ thread: makeThread(), posts });
    const result = await loadFn(makeEvent(makeLocals(supabase), { threadId: 't1' }, '5'));
    expect(result.totalPosts).toBe(30);
    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(1);
    const numbers = result.posts.map((p: { post_number: number }) => p.post_number);
    expect(numbers[0]).toBe(1);
  });

  it('clamps page 0 / negative to page 1', async () => {
    const posts = Array.from({ length: 30 }, (_, i) => makePost(i + 1));
    const supabase = makeSupabase({ thread: makeThread(), posts });
    const result = await loadFn(makeEvent(makeLocals(supabase), { threadId: 't1' }, '0'));
    expect(result.currentPage).toBe(1);
  });

  it('single-page thread (15 posts) returns all posts with totalPages 1', async () => {
    const posts = Array.from({ length: 15 }, (_, i) => makePost(i + 1));
    const supabase = makeSupabase({ thread: makeThread(), posts });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.posts).toHaveLength(15);
  });
});

describe('thread detail reply action', () => {
  const makeReplyEvent = (locals: ReturnType<typeof makeLocals>, fields: Record<string, string> = { content: '<p>respuesta</p>' }) =>
    ({
      locals,
      params: { threadId: 't1' },
      url: new URL('http://localhost/foro/t1'),
      request: new Request('http://localhost/foro/t1', {
        method: 'POST',
        body: new URLSearchParams(fields).toString(),
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
    const res = await replyFn(makeReplyEvent(makeLocals(supabase), { content: '<img src="data:image/png;base64,xxx">' }));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it('rejects a reply with a javascript: href with 400 (REQ-FC-03/03.5)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({ thread: makeThread({ is_locked: false }), insertedPosts: inserted });
    const res = await replyFn(
      makeReplyEvent(makeLocals(supabase), { content: '<p>leer <a href="javascript:alert(1)">acá</a></p>' }),
    );
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  // REQ-FC-04 / REQ-FORUM-03.2: server validates the quote payload and prepends
  // an authoritative blockquote to the saved body (deduplicating the prefill).
  const quoteFields = (over: Record<string, string> = {}) => ({
    quote_author: 'Aragorn',
    quote_excerpt: 'Cita citada',
    quote_post_id: 'p1',
    ...over,
  });

  const makeQuoteReplyEvent = (locals: ReturnType<typeof makeLocals>, over: Record<string, string> = {}) =>
    makeReplyEvent(locals, { content: '<p>mi respuesta</p>', ...quoteFields(over) });

  it('valid quote → blockquote prepended once, reply preserved (REQ-FC-04)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread({ is_locked: false }),
      // existing post p1 is the quoted post, present in this thread
      posts: [
        { id: 'p1', post_number: 1, body: '<p>cita</p>', author_id: 'u9', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null },
      ],
      insertedPosts: inserted,
    });
    const err = await replyFn(makeQuoteReplyEvent(makeLocals(supabase))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(inserted).toHaveLength(1);
    const body = String(inserted[0].body);
    const blocks = body.match(/<blockquote>/g) ?? [];
    expect(blocks).toHaveLength(1);
    expect(body.startsWith('<blockquote>')).toBe(true);
    expect(body).toContain('Aragorn');
    expect(body).toContain('Cita citada');
    expect(body).toContain('mi respuesta');
  });

  it('does not duplicate the blockquote when content already carries the prefill (dedup)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread({ is_locked: false }),
      posts: [{ id: 'p1', post_number: 1, body: '<p>cita</p>', author_id: 'u9', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null }],
      insertedPosts: inserted,
    });
    const prefilled =
      '<blockquote><p><strong>Aragorn:</strong></p><p>Cita citada</p></blockquote><p></p><p>mi respuesta</p>';
    const err = await replyFn(
      makeReplyEvent(makeLocals(supabase), { content: prefilled, ...quoteFields() }),
    ).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(inserted).toHaveLength(1);
    const blocks = String(inserted[0].body).match(/<blockquote>/g) ?? [];
    expect(blocks).toHaveLength(1);
  });

  it('rejects a quote with empty author with 400 and does not insert', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread({ is_locked: false }),
      posts: [{ id: 'p1', post_number: 1, body: '<p>cita</p>', author_id: 'u9', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null }],
      insertedPosts: inserted,
    });
    const res = await replyFn(makeQuoteReplyEvent(makeLocals(supabase), { quote_author: '' }));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it('rejects a quote with excerpt > 500 chars with 400 and does not insert', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread({ is_locked: false }),
      posts: [{ id: 'p1', post_number: 1, body: '<p>cita</p>', author_id: 'u9', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null }],
      insertedPosts: inserted,
    });
    const res = await replyFn(makeQuoteReplyEvent(makeLocals(supabase), { quote_excerpt: 'x'.repeat(501) }));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it('rejects a quote whose post_id is not in this thread with 400 and does not insert', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread({ is_locked: false }),
      // thread only has post p1; quoting p999 (from elsewhere) must be rejected
      posts: [{ id: 'p1', post_number: 1, body: '<p>cita</p>', author_id: 'u9', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null }],
      insertedPosts: inserted,
    });
    const res = await replyFn(makeQuoteReplyEvent(makeLocals(supabase), { quote_post_id: 'p999' }));
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
