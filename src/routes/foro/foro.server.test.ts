/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, type Mock } from 'vitest';
import { load } from './+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

interface CategoryFixture {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_visible: boolean;
  sort_order: number;
}

// Fluent supabase mock: categories list, section_permissions list, threads list,
// and (search) characters + linked/character thread variants.
function makeSupabase(fixture: {
  categories?: CategoryFixture[];
  perms?: unknown[];
  threads?: unknown[];
  searchTitle?: unknown[]; // threads matching title ILIKE
  charNames?: Array<{ id: string; name?: string }>; // characters matching name ILIKE
  charThreads?: unknown[]; // threads matched via linked_entity (character)
  threadsOrder?: Mock;
}) {
  const from = (table: string) => {
    const orders: string[] = [];
    const marks: string[] = [];
    const b: Record<string, unknown> = {
      select: () => b,
      order: (col: string) => {
        orders.push(col);
        return b;
      },
      ilike: (col: string) => {
        marks.push(`ilike:${col}`);
        return b;
      },
      in: (col: string) => {
        marks.push(`in:${col}`);
        return b;
      },
      eq: () => b,
      then: (res: Handler, rej: Handler) => {
        let data: unknown;
        const error: unknown = null;
        if (table === 'categories') data = fixture.categories ?? [];
        else if (table === 'section_permissions') data = fixture.perms ?? [];
        else if (table === 'characters') data = fixture.charNames ?? [];
        else if (table === 'threads') {
          if (marks.includes('ilike:title')) data = fixture.searchTitle ?? [];
          else if (marks.includes('in:linked_entity_id')) data = fixture.charThreads ?? [];
          else data = fixture.threads ?? [];
        } else data = [];
        const result = { data, error };
        if (fixture.threadsOrder && table === 'threads') fixture.threadsOrder(orders);
        return Promise.resolve(result).then(res, rej);
      },
    };
    return b;
  };
  return { from };
}
type Handler = (...args: unknown[]) => void;

const cat = (p: Partial<CategoryFixture>): CategoryFixture => ({
  id: 'c-root',
  name: 'Root',
  description: null,
  parent_id: null,
  is_visible: true,
  sort_order: 0,
  ...p,
});

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role: string = 'pendiente') =>
  ({ supabase, user: role === 'pendiente' ? null : { id: 'u1' }, profile: { id: 'u1', role } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, query: string = '') =>
  ({ locals, url: new URL(`http://localhost/foro${query}`), params: {} }) as never;

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
