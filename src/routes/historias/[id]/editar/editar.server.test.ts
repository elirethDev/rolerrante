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
// terminal operations resolve from the `fixture`, so tests can drive the
// load() (list + single) and default action (story fetch, ownership fetch,
// character validation, update, audit rpc) paths.
//
// `.single()` on `stories` returns `loadStory`; on `characters` it returns
// `storyCharacter` when the query selects `id, player_id` (the story's owner
// lookup) and `ownedCharacter` otherwise (the chosen-character validation).
// ---------------------------------------------------------------------------
type SingleResult = { data: unknown; error: unknown } | null;
type Handler = (...args: unknown[]) => void;

export function makeSupabase(fixture: {
  loadStory?: SingleResult;
  storyCharacter?: SingleResult;
  charactersList?: unknown[];
  ownedCharacter?: SingleResult;
  updateStory?: Mock;
  logAudit?: Mock;
}) {
  const from = (table: string) => {
    const isStories = table === 'stories';
    let selected = '';
    const b: Record<string, unknown> = {
      select: (fields: string) => {
        selected = fields;
        return b;
      },
      eq: () => b,
      in: () => b,
      order: () => b,
      single: () => {
        if (isStories) return Promise.resolve(fixture.loadStory ?? null);
        return Promise.resolve(
          selected === 'id, player_id' ? fixture.storyCharacter ?? null : fixture.ownedCharacter ?? null,
        );
      },
      update: (obj: Record<string, unknown>) => {
        if (isStories && fixture.updateStory) fixture.updateStory(obj);
        const result = { data: null, error: null };
        return {
          eq: () => ({
            then: (res: Handler, rej: Handler) => Promise.resolve(result).then(res, rej),
          }),
        };
      },
      then: (res: Handler, rej: Handler) =>
        Promise.resolve({ data: fixture.charactersList ?? [], error: null }).then(res, rej),
    };
    return b;
  };

  return {
    from,
    rpc: (name: string, args: Record<string, unknown>) => {
      if (name === 'log_audit' && fixture.logAudit) fixture.logAudit(args);
      return Promise.resolve({ data: null, error: null });
    },
  };
}

const makeUser = (id = 'user-1') => ({ id } as never);

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  user = makeUser(),
  role: 'player' | 'gm' | 'admin' = 'player',
) => ({
  supabase,
  user,
  profile: { id: 'user-1', role },
} as never);

const makeEvent = (
  locals: ReturnType<typeof makeLocals>,
  params = { id: 'story-1' },
  body = 'title=t&content=c&character_id=c1',
): RequestEvent =>
  ({
    locals,
    params,
    request: new Request('http://localhost/historias/story-1/editar', {
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

describe('editar route load()', () => {
  it('throws 403 for a non-owner player', async () => {
    const supabase = makeSupabase({
      loadStory: {
        data: { id: 'story-1', character: { player_id: 'user-999' } },
        error: null,
      },
    });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase)) as never), 403);
  });

  it.each(['aprobado', 'pendiente'])(
    'owner loads their own story when status is %s',
    async (status) => {
      const supabase = makeSupabase({
        loadStory: {
          data: {
            id: 'story-1',
            status,
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
      expect(result.isStaff).toBe(false);
    },
  );

  it.each(['gm', 'admin'] as const)(
    'staff (%s) can load another player story in any status',
    async (role) => {
      const supabase = makeSupabase({
        loadStory: {
          data: {
            id: 'story-1',
            status: 'pendiente',
            title: 'Historia ajena',
            content: '<p>Contenido</p>',
            character_id: 'c1',
            character: { id: 'c1', name: 'Aragorn', player_id: 'user-999' },
          },
          error: null,
        },
        charactersList: [{ id: 'c2', name: 'Gimli' }],
      });
      const result = await loadFn(makeEvent(makeLocals(supabase, makeUser(), role)) as never);
      expect(result.story.id).toBe('story-1');
      expect(result.isStaff).toBe(true);
    },
  );
});

describe('editar route default action', () => {
  it('fails 400 and preserves values when title is empty', async () => {
    const supabase = makeSupabase({});
    const res = await defaultFn(makeEvent(makeLocals(supabase), { id: 'story-1' }, 'title=&content=c&character_id=c1'));
    expect(res.status).toBe(400);
    expect((res as { data: { title: string } }).data.title).toBe('');
  });

  it('fails 403 when a player saves a story they do not own', async () => {
    const supabase = makeSupabase({
      loadStory: { data: { id: 'story-1', character_id: 'c1' }, error: null },
      storyCharacter: { data: { id: 'c1', player_id: 'user-999' }, error: null },
    });
    const res = await defaultFn(makeEvent(makeLocals(supabase)));
    expect(res.status).toBe(403);
  });

  it('fails 403 when the chosen character is not allowed for the role', async () => {
    const supabase = makeSupabase({
      loadStory: { data: { id: 'story-1', character_id: 'c1' }, error: null },
      storyCharacter: { data: { id: 'c1', player_id: 'user-1' }, error: null },
      ownedCharacter: { data: null, error: null },
    });
    const res = await defaultFn(makeEvent(makeLocals(supabase), { id: 'story-1' }, 'title=t&content=c&character_id=c2'));
    expect(res.status).toBe(403);
    expect((res as { data: { message: string } }).data.message).toBe('No puedes escribir para ese personaje');
  });

  it('updates the story without changing status and logs audit as owner', async () => {
    const updateStory = vi.fn();
    const logAudit = vi.fn();
    const supabase = makeSupabase({
      loadStory: { data: { id: 'story-1', character_id: 'c1' }, error: null },
      storyCharacter: { data: { id: 'c1', player_id: 'user-1' }, error: null },
      ownedCharacter: { data: { id: 'c1' }, error: null },
      updateStory,
      logAudit,
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
    });
    const updateArg = updateStory.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg).not.toHaveProperty('status');
    expect(logAudit).toHaveBeenCalledWith({
      p_action: 'editar',
      p_entity_type: 'story',
      p_entity_id: 'story-1',
      p_details: { character_id: 'c1', title: 't' },
    });
  });

  it('lets staff edit another player story using any approved character', async () => {
    const updateStory = vi.fn();
    const logAudit = vi.fn();
    const supabase = makeSupabase({
      loadStory: { data: { id: 'story-1', character_id: 'c1' }, error: null },
      storyCharacter: { data: { id: 'c1', player_id: 'user-999' }, error: null },
      ownedCharacter: { data: { id: 'c2' }, error: null },
      updateStory,
      logAudit,
    });
    await defaultFn(makeEvent(makeLocals(supabase, makeUser(), 'gm'), { id: 'story-1' }, 'title=t&content=c&character_id=c2')).then(
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
      character_id: 'c2',
    });
    expect(logAudit).toHaveBeenCalledWith({
      p_action: 'editar',
      p_entity_type: 'story',
      p_entity_id: 'story-1',
      p_details: { character_id: 'c2', title: 't' },
    });
  });
});
