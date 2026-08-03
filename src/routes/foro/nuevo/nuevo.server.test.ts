/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load, actions } from './+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

type Handler = (...args: unknown[]) => void;

interface Fixture {
  categories?: unknown[];
  insertError?: unknown;
  inserted?: Array<Record<string, unknown>>;
  audit?: { name: string; args: Record<string, unknown> }[];
}

function makeSupabase(f: Fixture) {
  const from = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      then: (res: Handler, rej: Handler) => {
        const data = table === 'categories' ? (f.categories ?? []) : [];
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
      insert: (row: Record<string, unknown>) => {
        (f.inserted ??= []).push({ id: `thread-${(f.inserted?.length ?? 0) + 1}`, ...row });
        return builder;
      },
      single: () => {
        if (table === 'threads' && f.inserted?.length) {
          return Promise.resolve({ data: f.inserted[f.inserted.length - 1], error: f.insertError ?? null });
        }
        if (table === 'categories') {
          return Promise.resolve({ data: { id: 'c1', parent_id: null }, error: null });
        }
        return Promise.resolve({ data: f.inserted?.[0] ?? null, error: null });
      },
    };
    return builder;
  };
  return {
    from,
    audit: (f.audit ??= []),
    rpc: (name: string, args: Record<string, unknown>) => {
      f.audit!.push({ name, args });
      return Promise.resolve({ data: null, error: null });
    },
  };
}

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role = 'rolero') =>
  ({ supabase, user: { id: 'u1' }, profile: { id: 'u1', role } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, body = '') =>
  ({
    locals,
    params: {},
    url: new URL('http://localhost/foro/nuevo'),
    request: new Request('http://localhost/foro/nuevo', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as never;

const formBody = (fields: Record<string, string>) => new URLSearchParams(fields).toString();

describe('foro/nuevo load()', () => {
  it('loads categories for debate creation', async () => {
    const supabase = makeSupabase({ categories: [{ id: 'c1', name: 'General' }] });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe('General');
  });
});

describe('foro/nuevo default action (create debate thread)', () => {
  it('creates a debate thread and logs crear_hilo audit', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({ inserted });
    const err = await defaultFn(
      makeEvent(makeLocals(supabase), formBody({ title: 'Nuevo debate', content: '<p>cuerpo</p>', category_id: 'c1' })),
    ).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e: { status?: number }) => e,
    );
    expect(err.status).toBe(303); // redirect to the new thread
    expect(inserted).toHaveLength(1);
    expect(inserted[0].content_type).toBe('debate');
    expect(inserted[0].title).toBe('Nuevo debate');
    expect(inserted[0].category_id).toBe('c1');
    expect(supabase.audit).toEqual([
      {
        name: 'log_audit',
        args: {
          p_action: 'crear_hilo',
          p_entity_type: 'thread',
          p_entity_id: 'thread-1',
          p_details: { title: 'Nuevo debate', category_id: 'c1' },
        },
      },
    ]);
  });

  it('rejects a body with a bad (javascript:) image url with 400', async () => {
    const supabase = makeSupabase({});
    const res = await defaultFn(
      makeEvent(makeLocals(supabase), formBody({ title: 'B', content: '<img src="javascript:alert(1)">', category_id: 'c1' })),
    );
    expect(res.status).toBe(400);
    expect((res as { data: { message: string } }).data.message).toContain('Imagen');
  });

  it('rejects missing title or content with 400', async () => {
    const supabase = makeSupabase({});
    const res = await defaultFn(makeEvent(makeLocals(supabase), formBody({ title: '', content: '', category_id: 'c1' })));
    expect(res.status).toBe(400);
  });
});
