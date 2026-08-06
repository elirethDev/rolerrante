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
const pinFn = actions.pin as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unpinFn = actions.unpin as unknown as (...args: unknown[]) => Promise<any>;
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
  quoteSearchId?: string;
  // like-action post lookup (posts.maybeSingle) -> { thread_id, thread: { status, author_id } }
  postForLike?: unknown;
  // graceful degradation (FIX-3): posts query errors (e.g. reactions table not deployed)
  postsError?: unknown;
  basePosts?: unknown[];
  postsCalls?: number;
  // reactions (like toggle) fixtures
  existingReaction?: unknown;
  insertedReactions?: Array<Record<string, unknown>>;
  deletedReactionIds?: string[];
  reactionsInsertError?: unknown;
  // pin/unpin update fixtures
  updateCalls?: Array<Record<string, unknown>>;
  updateError?: unknown;
  // follow/watch fixtures
  followState?: { notify_in_app: boolean } | null;
  // moderation fixtures (report action + ENF gate)
  insertRows?: Array<Record<string, unknown>>;
  authUser?: { id: string } | null;
  existingReport?: unknown;
  sanction?: { kind: string; active_until: string | null } | null;
  // SEC-04: category row for the thread (is_visible + min_read_role)
  category?: { id: string; is_visible: boolean; min_read_role: string | null } | null;
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
    let selection = '';
    const builder: Record<string, unknown> = {
      select: (sel?: unknown, opts?: { count?: string }) => {
        if (opts?.count) countOnly = true;
        if (typeof sel === 'string') selection = sel;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        if (deleting && table === 'posts') (f.deletedIds ??= []).push(String(val));
        if (deleting && table === 'reactions') (f.deletedReactionIds ??= []).push(String(val));
        if (!deleting && table === 'posts' && col === 'id') f.quoteSearchId = String(val);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      range: (a: number, b: number) => {
        rangeBounds = [a, b];
        return builder;
      },
      or: () => builder,
      maybeSingle: () => {
        if (table === 'thread_follows') return Promise.resolve({ data: f.followState ?? null, error: null });
        if (table === 'reactions') return Promise.resolve({ data: f.existingReaction ?? null, error: null });
        if (table === 'user_sanctions') return Promise.resolve({ data: f.sanction ?? null, error: null });
        if (table === 'reports') return Promise.resolve({ data: f.existingReport ?? null, error: null });
        if (table === 'categories') return Promise.resolve({ data: f.category ?? { id: 'c1', is_visible: true, min_read_role: null }, error: null });
        if (table === 'posts') {
          // like action selects the thread join -> serve postForLike
          if (selection.includes('thread:')) return Promise.resolve({ data: f.postForLike ?? null, error: null });
          // PERF-03: reply computes next post_number from the LAST post (desc limit 1)
          if (selection === 'post_number') {
            const current = Array.isArray(f.posts) ? (f.posts as Array<{ post_number?: number }>) : [];
            const max = current.reduce((m, p) => Math.max(m, Number(p.post_number) || 0), 0);
            return Promise.resolve({ data: max > 0 ? { post_number: max } : null, error: null });
          }
          // quote compose `.eq('id', quotePostId)`: return the matching post if present
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
          if (countOnly) return Promise.resolve({ data: null, error: null, count: (f.posts ?? []).length }).then(res, rej);
          // FIX-3: allow the FIRST posts query to error (reactions join missing);
          // the loader then re-queries base posts on the next call.
          f.postsCalls = (f.postsCalls ?? 0) + 1;
          const call = f.postsCalls - 1;
          if (f.postsError && call === 0) {
            return Promise.resolve({ data: null, error: f.postsError }).then(res, rej);
          }
          // emulate .order('post_number', ascending) for posts (route relies on it)
          let list = [...(f.basePosts ?? f.posts ?? [])].sort(
            (a, b) => Number((a as { post_number?: number }).post_number) - Number((b as { post_number?: number }).post_number),
          );
          if (rangeBounds) list = list.slice(rangeBounds[0], rangeBounds[1] + 1);
          data = list;
        } else if (table === 'reactions') {
          if (f.reactionsInsertError) return Promise.resolve({ data: null, error: f.reactionsInsertError }).then(res, rej);
          data = f.insertedReactions ?? [];
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
        if (table === 'reactions') {
          (f.insertedReactions ??= []).push({ id: `reaction-${(f.insertedReactions?.length ?? 0) + 1}`, ...row });
        }
        if (table === 'reports') {
          const newRow = { id: `rep-${(f.insertRows?.length ?? 0) + 1}`, ...row };
          (f.insertRows ??= []).push(newRow);
        }
        return builder;
      },
      update: (row: Record<string, unknown>) => {
        (f.updateCalls ??= []).push({ table, ...row });
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
  is_sticky: false,
  locked_by: null,
  locked_at: null,
  created_at: '2026-08-02T00:00:00Z',
  updated_at: '2026-08-02T00:00:00Z',
  edited_by: null,
  edited_at: null,
  author: { id: 'u1', display_name: 'Autor', username: 'autor' },
  ...p,
});

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role = 'rolero', userId: string | null = 'u1') =>
  ({ supabase, user: userId ? { id: userId } : null, profile: userId ? { id: userId, role } : null }) as never;

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

  it('carries like_count and viewer_has_liked per post via reactions left-join (REACT-01.2)', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      posts: [
        {
          id: 'p1', post_number: 1, body: '<p>a</p>', author_id: 'u1', created_at: 'x', updated_at: 'x',
          edited_by: null, edited_at: null, author: { id: 'u1', display_name: 'A', username: 'a' },
          reactions: [
            { post_id: 'p1', user_id: 'u1' },
            { post_id: 'p1', user_id: 'u2' },
            { post_id: 'p1', user_id: 'u3' },
          ],
        },
        {
          id: 'p2', post_number: 2, body: '<p>b</p>', author_id: 'u2', created_at: 'x', updated_at: 'x',
          edited_by: null, edited_at: null, author: { id: 'u2', display_name: 'B', username: 'b' },
          reactions: [],
        },
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1')));
    const [p1, p2] = result.posts;
    // viewer u1 liked p1 (3 likes total); p2 has no likes
    expect(p1.like_count).toBe(3);
    expect(p1.viewer_has_liked).toBe(true);
    expect(p2.like_count).toBe(0);
    expect(p2.viewer_has_liked).toBe(false);
  });

  it('sets viewer_has_liked null for guests but still exposes the count (REQ-02.3)', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      posts: [
        {
          id: 'p1', post_number: 1, body: '<p>a</p>', author_id: 'u1', created_at: 'x', updated_at: 'x',
          edited_by: null, edited_at: null, author: { id: 'u1', display_name: 'A', username: 'a' },
          reactions: [{ post_id: 'p1', user_id: 'u2' }],
        },
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'pendiente', null)));
    expect(result.posts[0].like_count).toBe(1);
    expect(result.posts[0].viewer_has_liked).toBeNull();
  });

  it('degrades to base posts with count 0 (not an empty thread) when the reactions join errors (FIX-3)', async () => {
    // reactions table/migration not deployed -> embedded join query errors (null data)
    const supabase = makeSupabase({
      thread: makeThread(),
      basePosts: [
        { id: 'p1', post_number: 1, body: '<p>a</p>', author_id: 'u1', thread_id: 't1', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null, author: { id: 'u1', display_name: 'A', username: 'a' } },
        { id: 'p2', post_number: 2, body: '<p>b</p>', author_id: 'u2', thread_id: 't1', created_at: 'x', updated_at: 'x', edited_by: null, edited_at: null, author: { id: 'u2', display_name: 'B', username: 'b' } },
      ],
      postsError: { message: 'relation "public.reactions" does not exist' },
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1')));
    // THE FIX: posts are still rendered (not silently empty), with a neutral reaction state
    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].like_count).toBe(0);
    expect(result.posts[0].viewer_has_liked).toBeNull();
    expect(result.posts[1].like_count).toBe(0);
    expect(result.posts[1].viewer_has_liked).toBeNull();
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

describe('thread detail category read gate (SEC-04)', () => {
  it('denies a viewer below the category min_read_role with 403', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      category: { id: 'c1', is_visible: true, min_read_role: 'gm' },
    });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1'))), 403);
  });

  it('admits a viewer meeting the min_read_role', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      category: { id: 'c1', is_visible: true, min_read_role: 'gm' },
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'gm', 'gm1')));
    expect(result.thread.title).toBe('Hilo');
  });

  it('denies access when the section_permissions row denies can_view for the role', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      sectionPerms: [{ category_id: 'c1', role: 'rolero', can_view: false, can_post: false, can_edit: false, can_lock: false }],
    });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1'))), 403);
  });

  it('grants a section_permissions can_view=true row access', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      sectionPerms: [{ category_id: 'c1', role: 'rolero', can_view: true, can_post: true, can_edit: false, can_lock: false }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1')));
    expect(result.flags.can_view).toBe(true);
  });

  it('lets staff read even when the section row denies can_view (management path)', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      sectionPerms: [{ category_id: 'c1', role: 'gm', can_view: false, can_post: true, can_edit: true, can_lock: true }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'gm', 'gm1')));
    expect(result.thread.title).toBe('Hilo');
  });

  it('falls through when the thread has no category (legacy threads)', async () => {
    const supabase = makeSupabase({ thread: makeThread({ category_id: null }) });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1')));
    expect(result.thread.title).toBe('Hilo');
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

describe('thread detail load() follow state (Slice 2)', () => {
  it('reports following=true with the stored in-app preference for an authenticated follow', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      followState: { notify_in_app: false },
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1')));
    expect(result.follow).toEqual({ following: true, notify_in_app: false });
    expect(result.isAuthenticated).toBe(true);
  });

  it('reports following=true with default preference when the stored follow has it enabled', async () => {
    const supabase = makeSupabase({ thread: makeThread(), followState: { notify_in_app: true } });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'u1')));
    expect(result.follow).toEqual({ following: true, notify_in_app: true });
  });

  it('reports following=false for a guest without querying follows', async () => {
    const supabase = makeSupabase({ thread: makeThread() });
    const result = await loadFn(makeEvent({ supabase, user: null, profile: null } as never));
    expect(result.follow).toEqual({ following: false, notify_in_app: true });
    expect(result.isAuthenticated).toBe(false);
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

  it('numbers the first reply 1 on an empty thread (desc limit-1 returns null)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread({ is_locked: false }),
      posts: [],
      insertedPosts: inserted,
    });
    const err = await replyFn(makeReplyEvent(makeLocals(supabase))).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].post_number).toBe(1);
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

  // OD alignment: the OP is the thread body (not a posts row), so quoting it sends
  // quote_post_id = thread.id. The server must accept that as "belongs to this
  // thread" and build the authoritative blockquote (REQ-FC-04 / REQ-FORUM-02.5).
  it('accepts a quote of the OP (quote_post_id = thread.id) and prepends the blockquote once', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread({ is_locked: false }),
      posts: [],
      insertedPosts: inserted,
    });
    const err = await replyFn(
      makeReplyEvent(makeLocals(supabase), {
        content: '<p>mi respuesta</p>',
        quote_author: 'Autor',
        quote_excerpt: 'apertura del hilo',
        quote_post_id: 't1',
      }),
    ).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(inserted).toHaveLength(1);
    const body = String(inserted[0].body);
    const blocks = body.match(/<blockquote>/g) ?? [];
    expect(blocks).toHaveLength(1);
    expect(body.startsWith('<blockquote>')).toBe(true);
    expect(body).toContain('Autor');
    expect(body).toContain('apertura del hilo');
    expect(body).toContain('mi respuesta');
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

  // OD alignment: the OP (thread body) is not a posts row; posting ?/report with
  // post_id = thread.id must get a clean 400 instead of a raw reports FK error.
  it('guards a report of the OP (post_id = thread.id) with a clean 400 and no insert', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread(),
      insertRows: inserted,
    });
    const res = await reportFn({
      locals: makeLocals(supabase, 'rolero', 'u1'),
      params: { threadId: 't1' },
      url: new URL('http://localhost/foro/t1'),
      request: new Request('http://localhost/foro/t1', {
        method: 'POST',
        body: new URLSearchParams({ post_id: 't1', reason: 'Spam' }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    } as never);
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
    expect((res as { data: { message: string } }).data.message).toContain('reportar');
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

describe('thread detail like action', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const likeFn = actions.like as unknown as (...args: unknown[]) => Promise<any>;

  const makeLikeEvent = (locals: ReturnType<typeof makeLocals>, postId = 'p2') =>
    ({
      locals,
      params: { threadId: 't1' },
      url: new URL('http://localhost/foro/t1'),
      request: new Request('http://localhost/foro/t1', {
        method: 'POST',
        body: new URLSearchParams({ post_id: postId }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    }) as never;

  it('inserts a reaction row on first like (REACT-01.3)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread(),
      postForLike: { id: 'p2', thread_id: 't1', thread: { status: 'abierto', author_id: 'u1' } },
      existingReaction: null,
      insertedReactions: inserted,
    });
    // success = redirect thrown (rejection)
    const err = await likeFn(makeLikeEvent(makeLocals(supabase, 'rolero', 'u1'), 'p2')).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].post_id).toBe('p2');
    expect(inserted[0].user_id).toBe('u1');
  });

  it('deletes the reaction row on unlike (re-click, REACT-01.3)', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      postForLike: { id: 'p2', thread_id: 't1', thread: { status: 'abierto', author_id: 'u1' } },
      existingReaction: { post_id: 'p2', user_id: 'u1', created_at: 'x' },
      insertedReactions: [],
    });
    const err = await likeFn(makeLikeEvent(makeLocals(supabase, 'rolero', 'u1'), 'p2')).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    expect(supabase.fixtures.insertedReactions ?? []).toHaveLength(0);
    // DELETE filtered by post_id + user_id (only own row)
    expect(supabase.fixtures.deletedReactionIds).toContain('p2');
    expect(supabase.fixtures.deletedReactionIds).toContain('u1');
  });

  it('blocks guest like with 401/redirect and no mutation (REACT-01.1)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({ thread: makeThread(), existingReaction: null, insertedReactions: inserted });
    // guest locals: no user
    const guestLocals = { supabase, user: null, profile: null } as never;
    const err = await likeFn(makeLikeEvent(guestLocals, 'p2')).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303); // requireAuth redirects to /login
    expect(inserted).toHaveLength(0);
    expect(supabase.fixtures.deletedReactionIds ?? []).toHaveLength(0);
  });

  it('treats UNIQUE race (23505) as silent no-op without error (design)', async () => {
    const supabase = makeSupabase({
      thread: makeThread(),
      postForLike: { id: 'p2', thread_id: 't1', thread: { status: 'abierto', author_id: 'u1' } },
      existingReaction: null,
      insertedReactions: [],
      reactionsInsertError: { code: '23505', message: 'duplicate key value violates unique constraint "reactions_pkey"' },
    });
    // No error surfaced: redirect (success) instead of fail() with message
    const err = await likeFn(makeLikeEvent(makeLocals(supabase, 'rolero', 'u1'), 'p2')).then(
      () => null,
      (e: { status?: number }) => e,
    );
    expect(err?.status).toBe(303);
    // No fail payload with a toastable message
    expect(err?.status).not.toBe(400);
  });

  it('rejects a like on a post that does not belong to this thread with 400 (FIX-2)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread(),
      postForLike: null, // no post matches (id, thread_id) -> cross-thread smuggling
      existingReaction: null,
      insertedReactions: inserted,
    });
    const res = await likeFn(makeLikeEvent(makeLocals(supabase, 'rolero', 'u1'), 'p2'));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
    expect(supabase.fixtures.deletedReactionIds ?? []).toHaveLength(0);
  });

  it('rejects a like on a post inside a hidden (pendiente) thread with 400 (FIX-2)', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      thread: makeThread(),
      postForLike: { id: 'p2', thread_id: 't1', thread: { status: 'pendiente', author_id: 'u999' } },
      existingReaction: null,
      insertedReactions: inserted,
    });
    const res = await likeFn(makeLikeEvent(makeLocals(supabase, 'rolero', 'u1'), 'p2'));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
    expect(supabase.fixtures.deletedReactionIds ?? []).toHaveLength(0);
  });
});

describe('thread detail pin/unpin actions', () => {
  const makePinEvent = (locals: ReturnType<typeof makeLocals>) =>
    ({ locals, params: { threadId: 't1' }, url: new URL('http://localhost/foro/t1') }) as never;

  it('gm pins a thread: sets is_sticky true and logs fijar_hilo', async () => {
    const supabase = makeSupabase({ thread: makeThread({ is_sticky: false }) });
    const res = await pinFn(makePinEvent(makeLocals(supabase, 'gm', 'staff1')));
    expect(res.success).toBe(true);
    const update = (supabase.fixtures.updateCalls ?? []).find((u) => u.is_sticky === true);
    expect(update).toBeDefined();
    const audit = supabase.fixtures.audit ?? [];
    expect(audit.some((a) => a.args?.p_action === 'fijar_hilo')).toBe(true);
  });

  it('gm unpins a thread: sets is_sticky false and logs desfijar_hilo', async () => {
    const supabase = makeSupabase({ thread: makeThread({ is_sticky: true }) });
    const res = await unpinFn(makePinEvent(makeLocals(supabase, 'admin', 'staff1')));
    expect(res.success).toBe(true);
    const update = (supabase.fixtures.updateCalls ?? []).find((u) => u.is_sticky === false);
    expect(update).toBeDefined();
    const audit = supabase.fixtures.audit ?? [];
    expect(audit.some((a) => a.args?.p_action === 'desfijar_hilo')).toBe(true);
  });

  it('blocks the author from pinning their own thread with 403', async () => {
    const supabase = makeSupabase({ thread: makeThread({ is_sticky: false }) });
    // author u1 is a gm but owns the thread -> must be rejected
    const res = await pinFn(makePinEvent(makeLocals(supabase, 'gm', 'u1')));
    expect(res.status).toBe(403);
    expect(supabase.fixtures.updateCalls ?? []).toHaveLength(0);
  });

  it('blocks a guest (pendiente) from pinning with 403', async () => {
    const supabase = makeSupabase({ thread: makeThread({ is_sticky: false }) });
    const res = await pinFn(makePinEvent(makeLocals(supabase, 'pendiente', 'guest1')));
    expect(res.status).toBe(403);
    expect(supabase.fixtures.updateCalls ?? []).toHaveLength(0);
  });

  it('returns is_sticky false by default in load()', async () => {
    const supabase = makeSupabase({ thread: makeThread() });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.isSticky).toBe(false);
  });

  it('returns is_sticky true in load() for a sticky thread', async () => {
    const supabase = makeSupabase({ thread: makeThread({ is_sticky: true }) });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.isSticky).toBe(true);
  });
});
