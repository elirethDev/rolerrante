/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { load } from './+page.server';

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

// Minimal chainable supabase mock for the /perfil load. One query per table:
//  characters:     .select().eq('player_id').order('updated_at')
//  events:         .select().eq('creator_id').order('created_at')
//  stories:        .select().in('character_id').order('updated_at')  (skipped when no characters)
//  notifications:  .select().eq('user_id').order('created_at').limit(5)
// The fixture map resolves the same table to the same data regardless of the
// builder chain, which is all the load needs.
interface ProfileFixture {
  characters?: unknown[] | null;
  events?: unknown[] | null;
  stories?: unknown[] | null;
  notifications?: unknown[] | null;
}

function makeSupabase(fixture: ProfileFixture = {}) {
  const tables: Record<string, unknown[] | null> = {
    characters: fixture.characters ?? [],
    events: fixture.events ?? [],
    stories: fixture.stories ?? [],
    notifications: fixture.notifications ?? [],
  };
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {
      select: (...a: unknown[]) => {
        calls.push({ table, method: 'select', args: a });
        return chain;
      },
      eq: (...a: unknown[]) => {
        calls.push({ table, method: 'eq', args: a });
        return chain;
      },
      in: (...a: unknown[]) => {
        calls.push({ table, method: 'in', args: a });
        return chain;
      },
      order: (...a: unknown[]) => {
        calls.push({ table, method: 'order', args: a });
        return chain;
      },
      limit: (...a: unknown[]) => {
        calls.push({ table, method: 'limit', args: a });
        return chain;
      },
      then: (res: (r: unknown) => void, rej: (r: unknown) => void) => {
        if (tables[table] === undefined) return rej(new Error(`no fixture for ${table}`));
        return res({ data: tables[table], error: null });
      },
    };
    return chain;
  });
  return { from, calls, tables };
}

const makeProfile = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  username: 'pablo',
  display_name: 'Pablo',
  avatar_url: null,
  role: 'rolero',
  ...over,
});

function makeLocals(
  supabase: ReturnType<typeof makeSupabase>,
  user: unknown = { id: 'u1' },
  profile: unknown = makeProfile(),
) {
  return { supabase, user, profile };
}

function makeEvent(locals: Record<string, unknown>): RequestEvent {
  return { locals } as unknown as RequestEvent;
}

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

const CHAR_ROWS = [
  { id: 'c1', name: 'Aragorn', rp_points: 3, status: 'aprobado', updated_at: '2026-08-03T10:00:00Z' },
  { id: 'c2', name: 'Legolas', rp_points: 1, status: 'aprobado', updated_at: '2026-08-01T10:00:00Z' },
  { id: 'c3', name: 'Borrador', rp_points: 0, status: 'borrador', updated_at: '2026-07-30T10:00:00Z' },
];

const STORY_ROWS = [
  { id: 's1', title: 'Los pasos del norte', status: 'aprobado', updated_at: '2026-08-03T09:00:00Z' },
  { id: 's2', title: 'El bosque encantado', status: 'borrador', updated_at: '2026-07-28T09:00:00Z' },
];

const EVENT_ROWS = [
  { id: 'e1', title: 'Asedio a la ciudadela', status: 'publicado', created_at: '2026-08-02T10:00:00Z' },
  { id: 'e2', title: 'Concilio cancelado', status: 'cancelado', created_at: '2026-07-25T10:00:00Z' },
];

const NOTIF_ROWS = [{ id: 'n1', type: 'new_reply', created_at: '2026-08-01T11:00:00Z' }];

describe('perfil load() — rich profile KPIs + activity feed', () => {
  it('redirects guests to /login (requireAuth)', async () => {
    const supabase = makeSupabase();
    await expectRedirect(
      () => loadFn(makeEvent(makeLocals(supabase, null, null))),
      '/login',
    );
  });

  it('computes KPIs from owned content (personajes/crónicas/eventos/reputación)', async () => {
    const supabase = makeSupabase({
      characters: CHAR_ROWS,
      stories: STORY_ROWS,
      events: EVENT_ROWS,
      notifications: NOTIF_ROWS,
    });
    const result = (await loadFn(
      makeEvent(makeLocals(supabase)),
    )) as { profile: unknown; kpis: any; actividad: any[] };

    expect(result.profile).toEqual(makeProfile());
    // approved characters only (c3 borrador excluded)
    expect(result.kpis.personajes).toBe(2);
    // approved stories only (s2 borrador excluded)
    expect(result.kpis.cronicas).toBe(1);
    // own events, cancelled excluded
    expect(result.kpis.eventos).toBe(1);
    // derived proxy: sum(rp_points of approved characters) + approved stories + active events = 3+1 + 1 + 1
    expect(result.kpis.reputacion).toBe(6);

    // queries were scoped to the logged-in user across the right tables
    const eqs = supabase.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toContainEqual(['player_id', 'u1']);
    expect(eqs).toContainEqual(['creator_id', 'u1']);
    expect(eqs).toContainEqual(['user_id', 'u1']);
  });

  it('builds the activity feed from stories/characters/events/notifications, newest-first and capped', async () => {
    const stories = [
      { id: 's0', title: 'Crónica 0', status: 'aprobado', updated_at: '2026-08-01T08:00:00Z' },
      { id: 's1', title: 'Crónica 1', status: 'aprobado', updated_at: '2026-08-02T08:00:00Z' },
      { id: 's2', title: 'Crónica 2', status: 'aprobado', updated_at: '2026-08-03T08:00:00Z' },
    ];
    const characters = [
      { id: 'c0', name: 'Héroe 0', rp_points: 1, status: 'aprobado', updated_at: '2026-07-01T08:00:00Z' },
      { id: 'c1', name: 'Héroe 1', rp_points: 1, status: 'aprobado', updated_at: '2026-07-02T08:00:00Z' },
      { id: 'c2', name: 'Héroe 2', rp_points: 1, status: 'aprobado', updated_at: '2026-07-03T08:00:00Z' },
    ];
    const events = [
      { id: 'e0', title: 'Evento 0', status: 'publicado', created_at: '2026-07-20T08:00:00Z' },
      { id: 'e1', title: 'Evento 1', status: 'publicado', created_at: '2026-07-21T08:00:00Z' },
      { id: 'e2', title: 'Evento 2', status: 'publicado', created_at: '2026-07-22T08:00:00Z' },
    ];
    const notifications = [
      { id: 'n0', type: 'new_reply', created_at: '2026-07-28T12:00:00Z' },
      { id: 'n1', type: 'new_reply', created_at: '2026-07-29T12:00:00Z' },
      { id: 'n2', type: 'new_reply', created_at: '2026-07-30T12:00:00Z' },
    ];

    const supabase = makeSupabase({ characters, stories, events, notifications });
    const result = (await loadFn(makeEvent(makeLocals(supabase)))) as {
      actividad: { id: string; kind: string; label: string; date: string; href?: string }[];
    };

    // 12 raw items are capped to 8, sorted newest-first
    expect(result.actividad.length).toBe(8);
    const dates = result.actividad.map((a) => new Date(a.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
    // newest item is the s2 story edit (2026-08-03T08)
    expect(result.actividad[0].kind).toBe('crónica');
    expect(result.actividad[0].label).toContain('Crónica 2');
    expect(result.actividad[0].href).toBe('/historias/s2');

    expect(supabase.calls.filter((c) => c.table === 'notifications' && c.method === 'limit')).toHaveLength(1);
  });

  it('skips the stories query when the player has no characters (fallback)', async () => {
    const supabase = makeSupabase({
      characters: [],
      stories: STORY_ROWS,
      events: EVENT_ROWS,
      notifications: NOTIF_ROWS,
    });
    const result = (await loadFn(makeEvent(makeLocals(supabase)))) as { kpis: any; actividad: any[] };

    expect(result.kpis.personajes).toBe(0);
    expect(result.kpis.cronicas).toBe(0);
    // no .in('character_id', []) call against stories
    expect(supabase.calls.some((c) => c.table === 'stories' && c.method === 'in')).toBe(false);
    // feed still carries the non-story sources (event + notification)
    expect(result.actividad.some((a) => a.kind === 'evento')).toBe(true);
    expect(result.actividad.some((a) => a.kind === 'notificación')).toBe(true);
  });

  it('degrades to zero KPIs and an empty feed when queries return null data', async () => {
    const supabase = makeSupabase({
      characters: null,
      events: null,
      stories: null,
      notifications: null,
    });
    const result = (await loadFn(makeEvent(makeLocals(supabase)))) as { kpis: any; actividad: any[] };

    expect(result.kpis).toEqual({ personajes: 0, cronicas: 0, eventos: 0, reputacion: 0 });
    expect(result.actividad).toEqual([]);
  });
});
