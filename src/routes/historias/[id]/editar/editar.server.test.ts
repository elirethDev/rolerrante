/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, vi, type Mock } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { load, actions } from './+page.server';

// Cast the SvelteKit-typed exports to loose versions for direct unit driving
// with the mocked event/locals (avoids strict RequestEvent<RouteParams> friction).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

// ---------------------------------------------------------------------------
// Minimal chainable supabase mock. Each `from(table)` returns a builder whose
// terminal operations resolve from the `mock` fixture, so tests can drive the
// load() (list + single) and default action (ownership single + update) paths.
// ---------------------------------------------------------------------------
type SingleResult = { data: unknown; error: unknown } | null;
type Handler = (...args: unknown[]) => void;

export function makeSupabase(fixture: {
  loadStory?: SingleResult;
  charactersList?: unknown[];
  ownedCharacter?: SingleResult;
  updateStory?: Mock;
}) {
  const from = (table: string) => {
    const isStories = table === 'stories';
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      in: () => b,
      order: () => b,
      single: () =>
        Promise.resolve(isStories ? fixture.loadStory ?? null : fixture.ownedCharacter ?? null),
      update: (obj: Record<string, unknown>) => {
        if (isStories && fixture.updateStory) fixture.updateStory(obj);
        const result = isStories
          ? { data: null, error: null }
          : { data: null, error: null };
        return {
          eq: () => ({
            then: (res: Handler, rej: Handler) =>
              Promise.resolve(result).then(res, rej),
          }),
        };
      },
      then: (res: Handler, rej: Handler) =>
        Promise.resolve({ data: fixture.charactersList ?? [], error: null }).then(res, rej),
    };
    return b;
  };

  return { from };
}

const makeUser = (id = 'user-1') => ({ id } as never);

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, user = makeUser()) => ({
  supabase,
  user,
  profile: { id: 'user-1', role: 'player' },
} as never);

const makeEvent = (
  locals: ReturnType<typeof makeLocals>,
  params = { id: 'story-1' },
): RequestEvent =>
  ({
    locals,
    params,
    request: new Request('http://localhost/historias/story-1/editar', {
      method: 'POST',
      body: 'title=t&content=c&character_id=c1',
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

describe('editar route load()', () => {
  it('throws 403 for a non-owner', async () => {
    const supabase = makeSupabase({
      loadStory: {
        data: { id: 'story-1', character: { player_id: 'user-999' } },
        error: null,
      },
    });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase)) as never), 403);
  });

  it('throws 403 when status is not rechazado', async () => {
    const supabase = makeSupabase({
      loadStory: {
        data: { id: 'story-1', status: 'pendiente', character: { player_id: 'user-1' } },
        error: null,
      },
    });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase)) as never), 403);
  });

  it('returns story + characters for the owner with status rechazado', async () => {
    const supabase = makeSupabase({
      loadStory: {
        data: {
          id: 'story-1',
          status: 'rechazado',
          title: 'Mi historia',
          content: '<p>Contenido</p>',
          character_id: 'c1',
          character: { id: 'c1', name: 'Aragorn', player_id: 'user-1' },
        },
        error: null,
      },
      charactersList: [{ id: 'c1', name: 'Aragorn' }, { id: 'c2', name: 'Legolas' }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)) as never);
    expect(result.story.id).toBe('story-1');
    expect(result.characters).toHaveLength(2);
  });
});

describe('editar route default action', () => {
  it('fails 400 and preserves values when title is empty', async () => {
    const supabase = makeSupabase({});
    const event = {
      ...makeEvent(makeLocals(supabase)),
      request: new Request('http://localhost/historias/story-1/editar', {
        method: 'POST',
        body: 'title=&content=c&character_id=c1',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    } as unknown as RequestEvent;
    const res = await defaultFn(event);
    expect(res.status).toBe(400);
    expect((res as { data: { title: string } }).data.title).toBe('');
  });

  it('fails 403 when character is not owned by the user', async () => {
    const supabase = makeSupabase({ ownedCharacter: { data: null, error: null } });
    const res = await defaultFn(makeEvent(makeLocals(supabase)));
    expect(res.status).toBe(403);
  });

  it('updates story with status pendiente and redirects 303', async () => {
    const updateStory = vi.fn();
    const supabase = makeSupabase({
      ownedCharacter: { data: { id: 'c1' }, error: null },
      updateStory,
    });
    await defaultFn(makeEvent(makeLocals(supabase))).then(
      () => {
        throw new Error('expected a redirect to be thrown');
      },
      (e) => {
        expect((e as { status?: number }).status).toBe(303);
        expect((e as { location?: string }).location).toBe('/historias/story-1');
      },
    );
    expect(updateStory).toHaveBeenCalledWith({
      title: 't',
      content: 'c',
      character_id: 'c1',
      status: 'pendiente',
    });
  });
});
