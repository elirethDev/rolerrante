/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load } from './+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

interface Fixture {
  category?: Record<string, unknown> | null;
  allCategories?: Array<Record<string, unknown>>;
  perms?: unknown[];
  threads?: Array<Record<string, unknown>>;
  posts?: Array<Record<string, unknown>>;
  sanction?: { kind: string; active_until: string | null } | null;
  threadOrders?: string[];
}

const STATUSES = ['abierto', 'aprobado'];

// Fluent supabase mock for the /foro/categoria/[id] route. Supports:
//   user_sanctions:      .maybeSingle()                    -> sanction (forum gate)
//   categories:          .eq(id).single()                  -> category
//   categories:          select().order(sort_order)        -> allCategories
//   section_permissions: select().eq(role)                 -> perms
//   threads:             select({count}).eq().in()         -> count (head)
//   threads:             select(+author).eq().in().order×2 -> threads (range-sliced)
//   posts:               select().in(thread_id)            -> posts
function makeSupabase(f: Fixture) {
  const fixtures = f;
  const from = (table: string) => {
    let countOnly = false;
    let rangeBounds: [number, number] | null = null;
    const builder: Record<string, unknown> = {
      select: (_sel?: unknown, opts?: { count?: string }) => {
        if (opts?.count) countOnly = true;
        return builder;
      },
      eq: () => builder,
      or: () => builder,
      order: (col: string) => {
        if (table === 'threads') fixtures.threadOrders?.push(col);
        return builder;
      },
      in: () => builder,
      range: (a: number, b: number) => {
        rangeBounds = [a, b];
        return builder;
      },
      maybeSingle: () => {
        if (table === 'user_sanctions') {
          return Promise.resolve({ data: f.sanction ?? null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      single: () => {
        if (table === 'categories') return Promise.resolve({ data: f.category ?? null, error: null });
        return Promise.resolve({ data: null, error: null });
      },
      then: (res: (v: unknown) => void, rej: (v: unknown) => void) => {
        let data: unknown;
        if (table === 'section_permissions') {
          data = f.perms ?? [];
        } else if (table === 'categories') {
          data = f.allCategories ?? [];
        } else if (table === 'threads') {
          if (countOnly) {
            const count = (f.threads ?? []).filter((t) => STATUSES.includes(String(t.status))).length;
            return Promise.resolve({ data: null, error: null, count }).then(res, rej);
          }
          let list = [...(f.threads ?? [])];
          if (rangeBounds) list = list.slice(rangeBounds[0], rangeBounds[1] + 1);
          data = list;
        } else if (table === 'posts') {
          data = f.posts ?? [];
        } else {
          data = [];
        }
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return builder;
  };
  return { from, fixtures, rpc: async () => ({ data: null, error: null }) };
}

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role = 'rolero') =>
  ({
    supabase,
    user: role === 'pendiente' ? null : { id: 'u1' },
    profile: { id: 'u1', role },
  }) as never;

const makeEvent = (
  locals: ReturnType<typeof makeLocals>,
  query = '',
  path = '/foro/categoria/c1',
  params: Record<string, unknown> = {},
) =>
  ({
    locals,
    url: new URL(`http://localhost${path}${query}`),
    params,
  }) as never;

const cat = (p: Partial<Record<string, unknown>> = {}) => ({
  id: 'c1',
  name: 'Debates',
  description: 'Discusión general',
  parent_id: null,
  is_visible: true,
  sort_order: 0,
  min_read_role: null,
  requires_approval: false,
  created_at: '2026-08-01T00:00:00Z',
  ...p,
});

const thread = (id: string, p: Partial<Record<string, unknown>> = {}) => ({
  id,
  title: `Hilo ${id}`,
  content_type: 'debate',
  status: 'abierto',
  is_locked: false,
  is_sticky: false,
  created_at: '2026-08-02T00:00:00Z',
  updated_at: '2026-08-02T00:00:00Z',
  category_id: 'c1',
  author: { id: 'u1', display_name: 'Gareth', username: 'gareth' },
  ...p,
});

describe('/foro/categoria/[categoryId] load()', () => {
  it('guest loads a visible public section with default flags', async () => {
    const supabase = makeSupabase({ category: cat(), allCategories: [], threads: [], posts: [] });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'pendiente'), '', '/foro/categoria/c1', { categoryId: 'c1' }));
    expect(result.category.name).toBe('Debates');
    expect(result.threads).toHaveLength(0);
    expect(result.children).toHaveLength(0);
    expect(result.totalThreads).toBe(0);
    expect(result.currentPage).toBe(1);
    // No section_permissions row: guests fall back to role defaults — now with
    // READ access (plaza de lectura pública); can_post stays false.
    expect(result.flags.can_view).toBe(true);
    expect(result.flags.can_post).toBe(false);
  });

  it('404 when the section does not exist', async () => {
    const supabase = makeSupabase({ category: null });
    let caught: { status?: number } | null = null;
    try {
      await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '', '/foro/categoria/nope', { categoryId: 'nope' }));
    } catch (e) {
      caught = e as { status?: number };
    }
    expect(caught?.status).toBe(404);
  });

  it('404 on a hidden section for non-staff', async () => {
    const supabase = makeSupabase({ category: cat({ is_visible: false }) });
    let caught: { status?: number } | null = null;
    try {
      await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '', '/foro/categoria/c1', { categoryId: 'c1' }));
    } catch (e) {
      caught = e as { status?: number };
    }
    expect(caught?.status).toBe(404);
  });

  it('403 when the viewer is below the section min_read_role (FORO-CAT-MINROLE)', async () => {
    const supabase = makeSupabase({ category: cat({ min_read_role: 'gm' }) });
    let caught: { status?: number } | null = null;
    try {
      await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '', '/foro/categoria/c1', { categoryId: 'c1' }));
    } catch (e) {
      caught = e as { status?: number };
    }
    expect(caught?.status).toBe(403);
  });

  it('admin bypasses is_visible and min_read_role', async () => {
    const supabase = makeSupabase({
      category: cat({ is_visible: false, min_read_role: 'gm' }),
      allCategories: [],
      threads: [],
      posts: [],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'admin'), '', '/foro/categoria/c1', { categoryId: 'c1' }));
    expect(result.category.name).toBe('Debates');
  });

  it('lists threads sticky-first and paginated (?page=), ordering by is_sticky then updated_at', async () => {
    // 25 threads, sticky first: page 1 -> 20, page 2 -> 5.
    const threads = Array.from({ length: 25 }, (_, i) => thread(`t${i + 1}`, { is_sticky: i === 0 }));
    const orders: string[] = [];
    const supabase = makeSupabase({
      category: cat(),
      allCategories: [],
      threads,
      posts: [],
      threadOrders: orders,
    });

    const page1 = await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '', '/foro/categoria/c1', { categoryId: 'c1' }));
    expect(page1.totalThreads).toBe(25);
    expect(page1.totalPages).toBe(2);
    expect(page1.currentPage).toBe(1);
    expect(page1.threads).toHaveLength(20);
    expect(page1.threads[0].is_sticky).toBe(true);
    expect(orders).toEqual(['is_sticky', 'updated_at']);

    const page2 = await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '?page=2', '/foro/categoria/c1', { categoryId: 'c1' }));
    expect(page2.currentPage).toBe(2);
    expect(page2.threads).toHaveLength(5);
  });

  it('clamps an out-of-range page back to page 1', async () => {
    const supabase = makeSupabase({
      category: cat(),
      allCategories: [],
      threads: [thread('t1'), thread('t2')],
      posts: [],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '?page=99', '/foro/categoria/c1', { categoryId: 'c1' }));
    expect(result.currentPage).toBe(1);
  });

  it('enriches each thread with posts_count and a lastPost carrying author + thread title + timestamp', async () => {
    const supabase = makeSupabase({
      category: cat(),
      allCategories: [],
      threads: [thread('t1')],
      posts: [
        {
          id: 'p1',
          thread_id: 't1',
          created_at: '2026-08-04T10:00:00Z',
          author: { id: 'u2', display_name: 'Nyx', username: 'nyx', avatar_url: 'https://x/a.png' },
        },
        {
          id: 'p2',
          thread_id: 't1',
          created_at: '2026-08-04T09:00:00Z',
          author: { id: 'u1', display_name: 'Gareth', username: 'gareth', avatar_url: null },
        },
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '', '/foro/categoria/c1', { categoryId: 'c1' }));
    const t = result.threads[0] as {
      posts_count: number;
      lastPost: {
        avatar_url: string | null;
        author_display_name: string | null;
        thread_title: string | null;
        thread_id: string | null;
        created_at: string | null;
      };
      author?: { display_name: string | null };
    };
    expect(t.posts_count).toBe(2);
    expect(t.lastPost).toEqual({
      avatar_url: 'https://x/a.png',
      author_display_name: 'Nyx',
      thread_title: 'Hilo t1',
      thread_id: 't1',
      created_at: '2026-08-04T10:00:00Z',
    });
    expect(t.author?.display_name).toBe('Gareth');
  });

  it('exposes viewable child sections as sub-navigation', async () => {
    const supabase = makeSupabase({
      category: cat(),
      allCategories: [
        cat({ id: 'c2', name: 'Hogar', parent_id: 'c1' }),
        cat({ id: 'c3', name: 'Secreto', parent_id: 'c1', is_visible: false }),
      ],
      threads: [],
      posts: [],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '', '/foro/categoria/c1', { categoryId: 'c1' }));
    const names = result.children.map((c: { name: string }) => c.name);
    expect(names).toContain('Hogar');
    expect(names).not.toContain('Secreto');
  });

  it('denies suspended/banned users (redirects home)', async () => {
    const supabase = makeSupabase({ category: cat(), sanction: { kind: 'ban', active_until: null } });
    let caught: { status?: number; location?: string } | null = null;
    try {
      await loadFn(makeEvent(makeLocals(supabase, 'rolero'), '', '/foro/categoria/c1', { categoryId: 'c1' }));
    } catch (e) {
      caught = e as { status?: number; location?: string };
    }
    expect(caught?.status).toBe(303);
    expect(caught?.location).toBe('/');
  });
});