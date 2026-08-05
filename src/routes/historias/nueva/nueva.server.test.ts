/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { load, actions } from './+page.server';
import { verifyTurnstileToken } from '$lib/turnstile';

vi.mock('$lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn(async () => true),
}));

// Cast the SvelteKit-typed exports to loose versions for direct unit driving.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

type SingleResult = { data: unknown; error: unknown } | null;
type Handler = (...args: unknown[]) => void;

// Minimal chainable supabase mock. Tracks the `status` filters applied to the
// `characters` table so tests can assert the load only asks for approved ones
// and the action rejects a non-approved character.
export function makeSupabase(fixture: {
  characters?: unknown[];
  character?: SingleResult;
  insertError?: unknown;
  inserted?: Mock;
}) {
  const statusFilters: string[] = [];
  const insertedRows: Array<Record<string, unknown>> = [];
  const from = (table: string) => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (col: string, val: unknown) => {
        if (table === 'characters' && col === 'status') statusFilters.push(String(val));
        return b;
      },
      in: (col: string, vals: unknown[]) => {
        if (table === 'characters' && col === 'status') statusFilters.push(...vals.map(String));
        return b;
      },
      order: () => b,
      single: () => {
        if (table === 'characters') return Promise.resolve(fixture.character ?? null);
        return Promise.resolve({
          data: insertedRows[0] ?? null,
          error: fixture.insertError ?? null,
        });
      },
      insert: (obj: Record<string, unknown>) => {
        if (fixture.inserted) fixture.inserted(obj);
        insertedRows.push({ id: 'story-1', ...obj });
        return b;
      },
      then: (res: Handler, rej: Handler) =>
        Promise.resolve({ data: fixture.characters ?? [], error: null }).then(res, rej),
    };
    return b;
  };
  return { from, statusFilters };
}

const makeUser = (id = 'user-1') => ({ id } as never);

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  user = makeUser(),
) => ({
  supabase,
  user,
  profile: { id: 'user-1', role: 'player' },
} as never);

const makeEvent = (
  locals: ReturnType<typeof makeLocals>,
  body = 'character_id=c1&title=t&content=c&cf-turnstile-response=token',
): RequestEventLike =>
  ({
    locals,
    params: {},
    request: new Request('http://localhost/historias/nueva', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as never;

/* eslint-disable @typescript-eslint/no-explicit-any */
type RequestEventLike = { locals: any; params: Record<string, string>; request: Request };

const formBody = (fields: Record<string, string>) => new URLSearchParams(fields).toString();

describe('historias/nueva load()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  });

  it('offers only approved characters to the player', async () => {
    const supabase = makeSupabase({
      characters: [{ id: 'c1', name: 'Aragorn' }, { id: 'c2', name: 'Legolas' }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.characters).toHaveLength(2);
    expect(supabase.statusFilters).toEqual(['aprobado']);
  });
});

describe('historias/nueva default action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  });

  it('rejects a character that is not approved', async () => {
    const supabase = makeSupabase({
      character: { data: { id: 'c1', status: 'borrador' }, error: null },
    });
    const res = await defaultFn(
      makeEvent(makeLocals(supabase), formBody({ character_id: 'c1', title: 't', content: 'c', 'cf-turnstile-response': 'token' })),
    );
    expect(res.status).toBe(400);
    expect((res as { data: { message: string } }).data.message).toContain('personaje aprobado');
  });

  it('creates the crónica for an approved character and redirects', async () => {
    const inserted = vi.fn();
    const supabase = makeSupabase({
      character: { data: { id: 'c1', status: 'aprobado' }, error: null },
      inserted,
    });
    const err = await defaultFn(
      makeEvent(makeLocals(supabase), formBody({ character_id: 'c1', title: 't', content: 'c', 'cf-turnstile-response': 'token' })),
    ).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e: { status?: number }) => e,
    );
    expect(err.status).toBe(303);
    expect(inserted).toHaveBeenCalledWith({
      character_id: 'c1',
      title: 't',
      content: 'c',
      status: 'pendiente',
    });
  });
});
