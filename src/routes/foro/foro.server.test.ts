/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, vi, type Mock } from 'vitest';
import { load, actions } from './+page.server';
import {
  makeEvent,
  makeLocals,
  makeSupabase as makeSupabaseMock,
  type SupabaseMock,
} from '../../../tests/helpers/supabase-mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

interface CategoryFixture {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_visible: boolean;
  sort_order: number;
  min_read_role?: string | null;
  requires_approval?: boolean;
}

// Supabase chainable mock is shared (tests/helpers/supabase-mock.ts, RED-04);
// only the /foro query-shape resolution stays fixture-local.
function makeSupabase(fixture: {
  categories?: CategoryFixture[];
  perms?: unknown[];
  threads?: unknown[];
  posts?: Array<Record<string, unknown>>;
  searchTitle?: unknown[]; // threads matching title ILIKE
  charNames?: Array<{ id: string; name?: string }>; // characters matching name ILIKE
  charThreads?: unknown[]; // threads matched via linked_entity (character)
  threadsOrder?: Mock;
  sanction?: { kind: string; active_until: string | null } | null;
}): SupabaseMock {
  const tables: Record<string, unknown[] | null> = {};
  if (fixture.categories !== undefined) tables.categories = fixture.categories;
  if (fixture.perms !== undefined) tables.section_permissions = fixture.perms;
  if (fixture.charNames !== undefined) tables.characters = fixture.charNames;
  if (fixture.posts !== undefined) tables.posts = fixture.posts;
  return makeSupabaseMock({
    tables,
    single: { user_sanctions: fixture.sanction ?? null },
    threadsOrder: fixture.threadsOrder ? (orders: string[]) => fixture.threadsOrder?.(orders) : undefined,
    resolve: (table, { marks, inSet }) => {
      if (table === 'threads') {
        if (marks.includes('ilike:title')) return fixture.searchTitle ?? [];
        if (marks.includes('in:linked_entity_id')) return fixture.charThreads ?? [];
        let list = fixture.threads ?? [];
        if (inSet.category_id) {
          list = list.filter((t) => inSet.category_id.includes(String((t as { category_id: string | null }).category_id)));
        }
        if (inSet.status) {
          list = list.filter((t) => inSet.status.includes(String((t as { status: string }).status)));
        }
        return list;
      }
      if (table === 'posts') {
        if (inSet.thread_id) {
          return (fixture.posts ?? []).filter((p) => inSet.thread_id.includes(String(p.thread_id)));
        }
        return fixture.posts ?? [];
      }
      return undefined;
    },
  });
}

const cat = (p: Partial<CategoryFixture>): CategoryFixture => ({
  id: 'c-root',
  name: 'Root',
  description: null,
  parent_id: null,
  is_visible: true,
  sort_order: 0,
  min_read_role: null,
  requires_approval: false,
  ...p,
});

describe('foro landing load()', () => {
  it('guest (pendiente) sees only visible categories with can_view from section perms', async () => {
    const supabase = makeSupabase({
      categories: [
        cat({ id: 'r1', name: 'Visible', is_visible: true, sort_order: 1 }),
        cat({ id: 'r2', name: 'Oculto', is_visible: false, sort_order: 2 }),
      ],
      perms: [{ category_id: 'r1', role: 'pendiente', can_view: true, can_post: false, can_edit: false, can_lock: false }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'pendiente')));
    // hidden category must be excluded for guests
    const names = result.categories.flatMap((r: { name: string }) => r.name);
    expect(names).toContain('Visible');
    expect(names).not.toContain('Oculto');
    // guest can_view true only on granted section
    const visible = result.categories.find((r: { id: string }) => r.id === 'r1');
    expect(visible.flags.can_view).toBe(true);
    expect(visible.flags.can_post).toBe(false);
  });

  it('admin sees all categories including hidden, with default can_view', async () => {
    const supabase = makeSupabase({
      categories: [
        cat({ id: 'r1', name: 'Visible', is_visible: true }),
        cat({ id: 'r2', name: 'Oculto', is_visible: false }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'admin')));
    expect(result.categories).toHaveLength(2);
    const hidden = result.categories.find((r: { id: string }) => r.id === 'r2');
    expect(hidden.flags.can_view).toBe(true);
  });

  it('non-staff gets can_view false (not true) on a hidden child of a visible parent (SEC-04)', async () => {
    const supabase = makeSupabase({
      categories: [
        cat({ id: 'r1', name: 'General', is_visible: true, sort_order: 1 }),
        cat({ id: 'sub1', name: 'Secreto', parent_id: 'r1', is_visible: false, sort_order: 1 }),
      ],
      perms: [{ category_id: 'r1', role: 'rolero', can_view: true, can_post: true, can_edit: false, can_lock: false }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero')));
    const root = result.categories.find((r: { id: string }) => r.id === 'r1');
    // The hidden child still appears in the tree (for admin), but must NOT report
    // can_view true to a non-staff viewer — the pre-fix ternary defaulted to true.
    expect(root.children[0].id).toBe('sub1');
    expect(root.children[0].flags.can_view).toBe(false);
  });

  it('builds a 2-level tree and returns public threads grouped by category', async () => {
    const supabase = makeSupabase({
      categories: [
        cat({ id: 'r1', name: 'General', sort_order: 1 }),
        cat({ id: 'sub1', name: 'Debates', parent_id: 'r1', sort_order: 1 }),
      ],
      perms: [{ category_id: 'r1', role: 'rolero', can_view: true, can_post: true, can_edit: false, can_lock: false }],
      threads: [
        { id: 't1', category_id: 'sub1', title: 'Hilo uno', status: 'abierto', is_locked: false, content_type: 'debate', created_at: '2026-08-02T00:00:00Z' },
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero')));
    const root = result.categories.find((r: { id: string }) => r.id === 'r1');
    expect(root.children).toHaveLength(1);
    expect(root.children[0].name).toBe('Debates');
    // threads grouped under the category they belong to
    const sub = root.children.find((c: { id: string }) => c.id === 'sub1');
    expect(sub.threads).toHaveLength(1);
    expect(sub.threads[0].title).toBe('Hilo uno');
  });
});

describe('foro search load() ?q=', () => {
  const thread = (id: string, title: string, p: Partial<Record<string, unknown>> = {}) => ({
    id,
    title,
    status: 'abierto',
    is_locked: false,
    content_type: 'debate',
    created_at: '2026-08-02T00:00:00Z',
    category_id: 'c-visible',
    ...p,
  });

  it('guest: returns public threads whose title matches q (REQ-SEARCH-01)', async () => {
    const supabase = makeSupabase({
      categories: [cat({ id: 'c-visible', name: 'General', is_visible: true })],
      searchTitle: [thread('t1', 'El dragón guardián')],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'pendiente'), '?q=drag%C3%B3n'));
    expect(result.isSearch).toBe(true);
    expect(result.searchResults).toHaveLength(1);
    expect(result.searchResults[0].title).toBe('El dragón guardián');
  });

  it('admin: returns threads for a character whose name matches q (REQ-SEARCH-01.2)', async () => {
    const supabase = makeSupabase({
      categories: [],
      charNames: [{ id: 'char-9', name: 'Elara' }],
      charThreads: [thread('t2', 'Ficha de Elara', { category_id: null, linked_entity_type: 'character', linked_entity_id: 'char-9' })],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'admin'), '?q=Elara'));
    expect(result.isSearch).toBe(true);
    expect(result.searchResults).toHaveLength(1);
  });

  it('guest: hidden/pending threads are NOT returned (REQ-SEARCH-01.3)', async () => {
    const supabase = makeSupabase({
      categories: [cat({ id: 'c-oculta', name: 'Oculto', is_visible: false })],
      searchTitle: [
        thread('t-pend', 'Pendiente secreto', { status: 'pendiente' }),
        thread('t-hide', 'Hilo en sección oculta', { category_id: 'c-oculta' }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'pendiente'), '?q=secreto'));
    expect(result.isSearch).toBe(true);
    expect(result.searchResults).toHaveLength(0);
  });

  it('empty or absent q renders the default tree (isSearch false) (REQ-SEARCH-01.4)', async () => {
    const supabase = makeSupabase({ categories: [cat({ id: 'c-root' })] });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'pendiente'), '?q='));
    expect(result.isSearch).toBe(false);
    expect(result.categories).toHaveLength(1);
  });

  it('dedups a thread that matches on both title and character overlap', async () => {
    const supabase = makeSupabase({
      categories: [cat({ id: 'c-visible', name: 'General', is_visible: true })],
      searchTitle: [thread('t1', 'Elara, la exploradora')],
      charNames: [{ id: 'char-1', name: 'Elara' }],
      charThreads: [thread('t1', 'Elara, la exploradora', { category_id: null })],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'admin'), '?q=Elara'));
    expect(result.isSearch).toBe(true);
    expect(result.searchResults).toHaveLength(1);
    expect(result.searchResults[0].id).toBe('t1');
  });
});

describe('foro category counts + last-post (REQ-FORUM-02.1/02.2)', () => {
  const trow = (id: string, category_id: string, created_at: string) => ({
    id,
    category_id,
    title: `Hilo ${id}`,
    status: 'abierto',
    is_locked: false,
    content_type: 'debate',
    created_at,
  });
  const post = (id: string, thread_id: string, created_at: string, author: Record<string, unknown>) => ({
    id,
    thread_id,
    created_at,
    author,
  });
  const author = (display_name: string, avatar_url: string | null = null) => ({
    id: `u-${display_name}`,
    display_name,
    username: display_name.toLowerCase(),
    avatar_url,
  });
  // 3 threads in sub1: 2 + 4 + 6 = 12 posts. Newest post belongs to t3 (created_at latest).
  const supabase = makeSupabase({
    categories: [
      cat({ id: 'r1', name: 'General', sort_order: 1 }),
      cat({ id: 'sub1', name: 'Debates', parent_id: 'r1', sort_order: 1 }),
    ],
    threads: [
      trow('t1', 'sub1', '2026-08-01T00:00:00Z'),
      trow('t2', 'sub1', '2026-08-02T00:00:00Z'),
      trow('t3', 'sub1', '2026-08-03T00:00:00Z'),
    ],
    posts: [
      post('p1', 't1', '2026-08-01T01:00:00Z', author('Una')),
      post('p2', 't1', '2026-08-01T02:00:00Z', author('Dos')),
      post('p3', 't2', '2026-08-02T01:00:00Z', author('Tres')),
      post('p4', 't2', '2026-08-02T02:00:00Z', author('Cuatro')),
      post('p5', 't2', '2026-08-02T03:00:00Z', author('Cinco')),
      post('p6', 't2', '2026-08-02T04:00:00Z', author('Seis')),
      post('p7', 't3', '2026-08-03T01:00:00Z', author('Siete')),
      post('p8', 't3', '2026-08-03T02:00:00Z', author('Ocho')),
      post('p9', 't3', '2026-08-03T03:00:00Z', author('Nueve')),
      post('p10', 't3', '2026-08-03T04:00:00Z', author('Diez')),
      post('p11', 't3', '2026-08-03T05:00:00Z', author('Once')),
      post('p12', 't3', '2026-08-03T06:00:00Z', author('Doce', 'https://x/avatar.png')),
    ],
  });

  it('category exposes threads_count 3 and posts_count 12, with last post avatar+author (02.1)', async () => {
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero')));
    const root = result.categories.find((r: { id: string }) => r.id === 'r1');
    const sub = root.children.find((c: { id: string }) => c.id === 'sub1');
    expect(sub.threads_count).toBe(3);
    expect(sub.posts_count).toBe(12);
    // lastPost is the most recent visible post: p12 by "Doce" with an avatar.
    expect(sub.lastPost).toEqual({
      avatar_url: 'https://x/avatar.png',
      author_display_name: 'Doce',
    });
  });

  it('each thread row carries its own posts_count (02.2)', async () => {
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero')));
    const root = result.categories.find((r: { id: string }) => r.id === 'r1');
    const sub = root.children.find((c: { id: string }) => c.id === 'sub1');
    expect(sub.threads).toHaveLength(3);
    const byId = new Map<string, { posts_count: number }>(
      (sub.threads as Array<{ id: string; posts_count: number }>).map((t) => [t.id, t]),
    );
    expect(byId.get('t1')?.posts_count).toBe(2);
    expect(byId.get('t2')?.posts_count).toBe(4);
    expect(byId.get('t3')?.posts_count).toBe(6);
  });

  it('empty category exposes 0/0 and no lastPost (02.1)', async () => {
    const empty = makeSupabase({
      categories: [
        cat({ id: 'r1', name: 'General', sort_order: 1 }),
        cat({ id: 'sub1', name: 'Vacía', parent_id: 'r1', sort_order: 1 }),
      ],
      threads: [],
    });
    const result = await loadFn(makeEvent(makeLocals(empty, 'rolero')));
    const root = result.categories.find((r: { id: string }) => r.id === 'r1');
    const sub = root.children.find((c: { id: string }) => c.id === 'sub1');
    expect(sub.threads_count).toBe(0);
    expect(sub.posts_count).toBe(0);
    expect(sub.lastPost).toBeNull();
  });

  it('guest counts exclude invisible categories and pending threads (visibility-filtered)', async () => {
    const guest = makeSupabase({
      categories: [
        cat({ id: 'pb', name: 'Público', is_visible: true, sort_order: 1 }),
        cat({ id: 'hide', name: 'Oculta', is_visible: false, sort_order: 2 }),
        cat({ id: 'sub', name: 'Sub', parent_id: 'pb', is_visible: true, sort_order: 1 }),
      ],
      threads: [
        trow('t-pub', 'sub', '2026-08-01T00:00:00Z'),
        { ...trow('t-pend', 'sub', '2026-08-02T00:00:00Z'), status: 'pendiente' },
        trow('t-hide', 'hide', '2026-08-03T00:00:00Z'),
      ],
      posts: [
        post('pa1', 't-pub', '2026-08-01T01:00:00Z', author('Pub')),
        post('pa2', 't-pend', '2026-08-02T01:00:00Z', author('Pend')),
        post('pa3', 't-hide', '2026-08-03T01:00:00Z', author('Hid')),
      ],
    });
    // Guest role: hidden category excluded, pending thread excluded by status filter.
    const result = await loadFn(makeEvent(makeLocals(guest, 'pendiente')));
    const names = result.categories.map((r: { name: string }) => r.name);
    expect(names).not.toContain('Oculta');
    const root = result.categories.find((r: { id: string }) => r.id === 'pb');
    const sub = root.children.find((c: { id: string }) => c.id === 'sub');
    expect(sub.threads_count).toBe(1);
    expect(sub.posts_count).toBe(1);
    expect(sub.lastPost).toEqual({ avatar_url: null, author_display_name: 'Pub' });
  });
});

describe('foro min-read-role gate (FORO-CAT-MINROLE)', () => {
  it('hides a min-gated category from a viewer below the minimum role', async () => {
    const supabase = makeSupabase({
      categories: [
        cat({ id: 'gm', name: 'Zona GM', is_visible: true, min_read_role: 'gm', sort_order: 1 }),
        cat({ id: 'pub', name: 'General', is_visible: true, min_read_role: null, sort_order: 2 }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero')));
    const names = result.categories.map((r: { name: string }) => r.name);
    expect(names).toContain('General');
    expect(names).not.toContain('Zona GM');
  });

  it('shows the category to a viewer meeting the minimum role', async () => {
    const supabase = makeSupabase({
      categories: [
        cat({ id: 'gm', name: 'Zona GM', is_visible: true, min_read_role: 'gm', sort_order: 1 }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'gm')));
    expect(result.categories.map((r: { name: string }) => r.name)).toContain('Zona GM');
  });

  it('admin sees every category regardless of min_read_role or is_visible', async () => {
    const supabase = makeSupabase({
      categories: [
        cat({ id: 'g1', name: 'Solo GM', is_visible: true, min_read_role: 'gm' }),
        cat({ id: 'h1', name: 'Oculta', is_visible: false }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'admin')));
    expect(result.categories).toHaveLength(2);
  });

  it('carries min_read_role and requires_approval onto the CategoryNode', async () => {
    const supabase = makeSupabase({
      categories: [
        cat({ id: 'g1', name: 'Aprobable', is_visible: true, min_read_role: 'rolero', requires_approval: true }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero')));
    const node = result.categories.find((r: { id: string }) => r.id === 'g1');
    expect(node.min_read_role).toBe('rolero');
    expect(node.requires_approval).toBe(true);
  });
});

describe('foro landing gate (REQ-MOD-ENF-03.2)', () => {
  const DAY = 86_400_000;
  const future = new Date(Date.now() + DAY).toISOString();

  const expectRedirectHome = async (locals: ReturnType<typeof makeLocals>) => {
    let caught: { status?: number; location?: string } | null = null;
    try {
      await loadFn(makeEvent(locals));
    } catch (e) {
      caught = e as { status?: number; location?: string };
    }
    expect(caught?.status).toBe(303);
    expect(caught?.location).toBe('/');
  };

  it('denies a user with an active suspension (redirects home)', async () => {
    const supabase = makeSupabase({ sanction: { kind: 'suspension', active_until: future } });
    await expectRedirectHome(makeLocals(supabase, 'rolero'));
  });

  it('denies a permanently banned user (redirects home)', async () => {
    const supabase = makeSupabase({ sanction: { kind: 'ban', active_until: null } });
    await expectRedirectHome(makeLocals(supabase, 'rolero'));
  });

  it('allows a user with no sanction (guest/clear) into the landing', async () => {
    const supabase = makeSupabase({ sanction: null });
    const result = await loadFn(makeEvent(makeLocals(supabase, 'pendiente')));
    // Reached the categories load instead of redirecting.
    expect(Array.isArray(result.categories)).toBe(true);
  });
});

// OD alignment: quick new-thread modal posts to ?/quickCreate on /foro with
// title, content, category plus optional is_sticky (staff) and allow_replies.
describe('foro quickCreate action (quick new-thread modal)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quickFn = actions.quickCreate as unknown as (...args: unknown[]) => Promise<any>;

  const makeActionEvent = (
    locals: ReturnType<typeof makeLocals>,
    fields: Record<string, string>,
  ) =>
    ({
      locals,
      params: {},
      url: new URL('http://localhost/foro'),
      request: new Request('http://localhost/foro', {
        method: 'POST',
        body: new URLSearchParams(fields).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    }) as never;

  const defaultFields = {
    title: 'Nuevo debate rápido',
    content: '<p>cuerpo</p>',
    category_id: 'c1',
    allow_replies: 'on',
  };

  const isRedirect = async (p: Promise<unknown>) => {
    let err: { status?: number; location?: string } | null = null;
    try {
      await p;
    } catch (e) {
      err = e as { status?: number; location?: string };
    }
    expect(err?.status).toBe(303);
    expect(String(err?.location)).toContain('/foro/');
    return err;
  };

  const auditActions = (rpc: Mock) =>
    rpc.mock.calls.map((c) => (c[0] as { p_action: string }).p_action);

  it('creates an open thread (allow_replies on, is_locked false) and logs crear_hilo', async () => {
    const inserted: Record<string, unknown[]> = { threads: [] };
    const audit = vi.fn();
    const supabase = makeSupabaseMock({
      single: { categories: { id: 'c1', parent_id: null } },
      tables: {
        section_permissions: [
          { category_id: 'c1', role: 'rolero', can_view: true, can_post: true, can_edit: false, can_lock: false },
        ],
      },
      inserted,
      rpc: { log_audit: audit },
    });
    await isRedirect(quickFn(makeActionEvent(makeLocals(supabase, 'rolero'), defaultFields)));
    const row = inserted.threads[0] as Record<string, unknown>;
    expect(row).toMatchObject({
      content_type: 'debate',
      title: 'Nuevo debate rápido',
      category_id: 'c1',
      author_id: 'u1',
      status: 'abierto',
      is_locked: false,
      is_sticky: false,
    });
    expect(auditActions(audit)).toEqual(['crear_hilo']);
  });

  it('honors allow_replies=off by creating a locked thread (is_locked true)', async () => {
    const inserted: Record<string, unknown[]> = { threads: [] };
    const supabase = makeSupabaseMock({
      single: { categories: { id: 'c1', parent_id: null } },
      tables: {
        section_permissions: [
          { category_id: 'c1', role: 'rolero', can_view: true, can_post: true, can_edit: false, can_lock: false },
        ],
      },
      inserted,
    });
    await isRedirect(
      quickFn(makeActionEvent(makeLocals(supabase, 'rolero'), { ...defaultFields, allow_replies: 'off' })),
    );
    expect((inserted.threads[0] as Record<string, unknown>).is_locked).toBe(true);
  });

  it('lets staff set is_sticky and logs fijar_hilo in addition to crear_hilo', async () => {
    const inserted: Record<string, unknown[]> = { threads: [] };
    const audit = vi.fn();
    const supabase = makeSupabaseMock({
      single: { categories: { id: 'c1', parent_id: null } },
      tables: {},
      inserted,
      rpc: { log_audit: audit },
    });
    await isRedirect(
      quickFn(
        makeActionEvent(makeLocals(supabase, 'gm', 'staff1'), {
          ...defaultFields,
          is_sticky: 'on',
        }),
      ),
    );
    expect((inserted.threads[0] as Record<string, unknown>).is_sticky).toBe(true);
    expect(auditActions(audit)).toEqual(['crear_hilo', 'fijar_hilo']);
  });

  it('silently forces is_sticky false for non-staff even when the flag is smuggled', async () => {
    const inserted: Record<string, unknown[]> = { threads: [] };
    const audit = vi.fn();
    const supabase = makeSupabaseMock({
      single: { categories: { id: 'c1', parent_id: null } },
      tables: {},
      inserted,
      rpc: { log_audit: audit },
    });
    await isRedirect(
      quickFn(
        makeActionEvent(makeLocals(supabase, 'rolero', 'u1'), {
          ...defaultFields,
          is_sticky: 'on',
        }),
      ),
    );
    expect((inserted.threads[0] as Record<string, unknown>).is_sticky).toBe(false);
    expect(auditActions(audit)).toEqual(['crear_hilo']);
  });

  it('rejects a missing title/content/section with 400', async () => {
    const inserted: Record<string, unknown[]> = { threads: [] };
    const supabase = makeSupabaseMock({ single: { categories: { id: 'c1', parent_id: null } }, inserted });
    const res = await quickFn(
      makeActionEvent(makeLocals(supabase, 'rolero'), { title: '', content: '', category_id: '' }),
    );
    expect(res.status).toBe(400);
    expect(inserted.threads).toHaveLength(0);
  });

  it('rejects an invalid section with 403', async () => {
    const inserted: Record<string, unknown[]> = { threads: [] };
    const supabase = makeSupabaseMock({ single: { categories: null }, inserted });
    const res = await quickFn(makeActionEvent(makeLocals(supabase, 'rolero'), defaultFields));
    expect(res.status).toBe(403);
    expect(inserted.threads).toHaveLength(0);
  });

  it('rejects a body with a forbidden image url with 400 before any insert', async () => {
    const inserted: Record<string, unknown[]> = { threads: [] };
    const supabase = makeSupabaseMock({ single: { categories: { id: 'c1', parent_id: null } }, inserted });
    const res = await quickFn(
      makeActionEvent(makeLocals(supabase, 'rolero'), {
        ...defaultFields,
        content: '<img src="javascript:alert(1)">',
      }),
    );
    expect(res.status).toBe(400);
    expect(inserted.threads).toHaveLength(0);
  });

  it('requires auth: a guest hit on quickCreate redirects to login', async () => {
    const inserted: Record<string, unknown[]> = { threads: [] };
    const supabase = makeSupabaseMock({ inserted });
    let err: { status?: number; location?: string } | null = null;
    try {
      await quickFn(makeActionEvent(makeLocals(supabase, 'pendiente'), defaultFields));
    } catch (e) {
      err = e as { status?: number; location?: string };
    }
    expect(err?.status).toBe(303);
    expect(String(err?.location)).toContain('/login');
    expect(inserted.threads).toHaveLength(0);
  });
});
