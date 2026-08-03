/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, vi, type Mock } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { load, actions } from '../../../src/routes/admin/foro/+page.server';

// Cast the SvelteKit-typed exports to loose versions for direct unit driving
// with the mocked event/locals.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const act = (name: string) => (actions as any)[name] as unknown as (...args: unknown[]) => Promise<any>;

interface Fixture {
  categories?: unknown[];
  permsList?: unknown[];
  thread?: unknown;
}

// Minimal chainable supabase mock covering the admin/foro flows:
//  categories:            .select().order() ; .insert() ; .update().eq() ; .delete().eq()
//  section_permissions:   .select() ; .upsert()
//  rpc('log_audit')       records the args so tests can assert the audit row
function makeSupabase(fixture: Fixture = {}) {
  const calls: Record<string, unknown[]> = { insert: [], update: [], upsert: [], delete: [], rpc: [] };
  const from = vi.fn((table: string) => {
    const b: Record<string, unknown> = {
      select: vi.fn(() => b),
      eq: vi.fn(() => b),
      order: vi.fn(() => b),
      insert: vi.fn((row: unknown) => {
        calls.insert.push(row);
        return b;
      }),
      update: vi.fn((row: unknown) => {
        calls.update.push(row);
        return b;
      }),
      delete: vi.fn(() => {
        calls.delete.push(table);
        return b;
      }),
      upsert: vi.fn((row: unknown) => {
        calls.upsert.push(row);
        return b;
      }),
      maybeSingle: vi.fn(async () => ({
        data: table === 'threads' ? (fixture.thread ?? null) : null,
        error: null,
      })),
      single: vi.fn(async () => ({ data: null, error: null })),
      then: (res: (...a: unknown[]) => void, rej: (...a: unknown[]) => void) => {
        const list =
          table === 'categories'
            ? fixture.categories ?? []
            : table === 'section_permissions'
              ? fixture.permsList ?? []
              : null;
        return Promise.resolve({ data: list, error: null }).then(res, rej);
      },
    };
    return b;
  });
  const rpc = vi.fn(async (name: string, args: unknown) => {
    calls.rpc.push({ name, args });
    return { data: null, error: null };
  });
  return { from, rpc, calls };
}

const makeUser = (id = 'admin-1') => ({ id } as never);

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  role: 'player' | 'gm' | 'admin' = 'admin',
  id = 'admin-1',
) => ({ supabase, user: makeUser(id), profile: { id, role } } as never);

const makeEvent = (
  locals: ReturnType<typeof makeLocals>,
  body = '',
  url = 'http://localhost/admin/foro',
): RequestEvent =>
  ({
    locals,
    request: new Request(url, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as unknown as RequestEvent;

const expectError = (fn: () => Promise<unknown>, status: number) => {
  return fn().then(
    () => {
      throw new Error('expected an http-error to be thrown');
    },
    (e) => {
      expect((e as { status?: number }).status).toBe(status);
    },
  );
};

const expectRedirect = (fn: () => Promise<unknown>, location: string) => {
  return fn().then(
    () => {
      throw new Error('expected a redirect to be thrown');
    },
    (e) => {
      expect((e as { status?: number }).status).toBe(303);
      expect((e as { location?: string }).location).toBe(location);
    },
  );
};

describe('admin/foro load() (REQ-FORUM-04.1)', () => {
  it('throws 403 for a non-admin', async () => {
    const supabase = makeSupabase();
    await expectError(() => loadFn(makeEvent(makeLocals(supabase, 'player'))), 403);
  });

  it('returns categories and section permissions for an admin', async () => {
    const supabase = makeSupabase({ categories: [{ id: 'c1', name: 'Roles' }], permsList: [{ category_id: 'c1', role: 'rolero', can_view: true }] });
    const result = (await loadFn(makeEvent(makeLocals(supabase)))) as { categories: { id: string }[] };
    expect(result.categories[0].id).toBe('c1');
    expect(supabase.from).toHaveBeenCalledWith('section_permissions');
  });
});

describe('admin/foro category CRUD actions (REQ-FORUM-04.1)', () => {
  it('createCategory fails 403 for a non-admin', async () => {
    const supabase = makeSupabase();
    await expectError(() => act('createCategory')(makeEvent(makeLocals(supabase, 'player'), 'name=Foro')), 403);
  });

  it('createCategory creates a visible category and redirects to /admin/foro', async () => {
    const supabase = makeSupabase();
    await expectRedirect(
      () => act('createCategory')(makeEvent(makeLocals(supabase), 'name=Nuevo+Foro&description=desc&sort_order=2')),
      '/admin/foro',
    );
    expect((supabase.calls.insert[0] as { name: string; is_visible: boolean }).name).toBe('Nuevo Foro');
    expect((supabase.calls.insert[0] as { is_visible: boolean }).is_visible).toBe(true);
    expect((supabase.calls.insert[0] as { sort_order: number }).sort_order).toBe(2);
  });

  it('createCategory fails 400 when name is empty', async () => {
    const supabase = makeSupabase();
    const res = (await act('createCategory')(makeEvent(makeLocals(supabase), 'name='))) as { status: number };
    expect(res.status).toBe(400);
  });

  it('updateCategory renames, reorders and toggles visibility', async () => {
    const supabase = makeSupabase();
    await expectRedirect(
      () => act('updateCategory')(makeEvent(makeLocals(supabase), 'id=c1&name=Renombrado&sort_order=5&is_visible=on')),
      '/admin/foro',
    );
    expect((supabase.calls.update[0] as { name: string; sort_order: number; is_visible: boolean }).name).toBe('Renombrado');
    expect((supabase.calls.update[0] as { sort_order: number }).sort_order).toBe(5);
    expect((supabase.calls.update[0] as { is_visible: boolean }).is_visible).toBe(true);
  });

  it('toggleVisibility hides a category', async () => {
    const supabase = makeSupabase();
    await expectRedirect(() => act('toggleVisibility')(makeEvent(makeLocals(supabase), 'id=c1')), '/admin/foro');
    expect((supabase.calls.update[0] as { is_visible: boolean }).is_visible).toBe(false);
  });

  it('deleteCategory removes a category', async () => {
    const supabase = makeSupabase();
    await expectRedirect(() => act('deleteCategory')(makeEvent(makeLocals(supabase), 'id=c1')), '/admin/foro');
    expect(supabase.calls.delete).toContain('categories');
  });
});

describe('admin/foro setSectionPermissions (REQ-FORUM-04.2/04.4)', () => {
  it('persists flags and logs editar_permisos audit', async () => {
    const supabase = makeSupabase();
    const res = (await act('setSectionPermissions')(
      makeEvent(makeLocals(supabase), 'categoryId=c1&role=rolero&can_view=on&can_post=on'),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('section_permissions');
    expect(supabase.calls.upsert[0]).toMatchObject({
      category_id: 'c1',
      role: 'rolero',
      can_view: true,
      can_post: true,
      can_edit: false,
      can_lock: false,
    });
    // audit row asserted (REQ-FORUM-04.4): editar_permisos
    const audit = supabase.calls.rpc.find((r) => (r as { name: string }).name === 'log_audit') as { args: { p_action: string; p_entity_id: string; p_details: { role: string } } };
    expect(audit.args.p_action).toBe('editar_permisos');
    expect(audit.args.p_entity_id).toBe('c1');
    expect(audit.args.p_details.role).toBe('rolero');
  });

  it('fails 403 for a non-admin', async () => {
    const supabase = makeSupabase();
    await expectError(
      () => act('setSectionPermissions')(makeEvent(makeLocals(supabase, 'player'), 'categoryId=c1&role=rolero')),
      403,
    );
  });

  it('fails 400 for an invalid role', async () => {
    const supabase = makeSupabase();
    const res = (await act('setSectionPermissions')(
      makeEvent(makeLocals(supabase, 'admin'), 'categoryId=c1&role=king'),
    )) as { status: number };
    expect(res.status).toBe(400);
  });
});
