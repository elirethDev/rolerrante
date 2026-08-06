/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load } from './+page.server';
import { STORY_TABS } from '$lib/historias';

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

type Row = Record<string, any>;

function makeSupabase(fixture: { stories?: Row[]; characters?: Row[] }) {
  const from = (table: string) => {
    const preds: Array<{ op: string; col: string; val: unknown }> = [];
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: (col: string, val: unknown) => {
        preds.push({ op: 'eq', col, val });
        return builder;
      },
      in: (col: string, val: unknown) => {
        preds.push({ op: 'in', col, val });
        return builder;
      },
      ilike: (col: string, val: unknown) => {
        preds.push({ op: 'ilike', col, val });
        return builder;
      },
      then: (res: (...a: unknown[]) => void, rej: (...a: unknown[]) => void) => {
        const source = table === 'stories' ? fixture.stories ?? [] : fixture.characters ?? [];
        let rows = [...source];
        for (const p of preds) {
          if (p.op === 'eq') rows = rows.filter((r) => r[p.col] === p.val);
          if (p.op === 'in') rows = rows.filter((r) => (p.val as unknown[]).includes(r[p.col]));
          if (p.op === 'ilike') {
            const needle = String(p.val ?? '')
              .replace(/^%/, '')
              .replace(/%$/, '')
              .toLowerCase();
            rows = rows.filter((r) => String(r[p.col] ?? '').toLowerCase().includes(needle));
          }
        }
        return Promise.resolve({ data: rows, error: null }).then(res, rej);
      },
    };
    return builder;
  };
  return { from };
}

const story = (p: Partial<Row>): Row => ({
  id: 's1',
  title: 'Un viaje por el valle',
  status: 'aprobado',
  character_id: 'c-aragorn',
  character: {
    id: 'c-aragorn',
    name: 'Aragorn',
    status: 'aprobado',
    player: { id: 'u1', display_name: 'Pablo', username: 'pablo' },
  },
  created_at: '2026-01-01T00:00:00Z',
  ...p,
});

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  user: { id: string } | null = null,
) => ({ supabase, user, profile: user ? { id: user.id, role: 'rolero' } : null }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, query = '') =>
  ({ locals, url: new URL(`http://localhost/historias${query}`), params: {} }) as never;

describe('historias index load() — server-side tabs and search', () => {
  it('legacy URL without params shows the full visible feed (todas)', async () => {
    const supabase = makeSupabase({
      stories: [story({}), story({ id: 's2', status: 'borrador', title: 'Boceto' })],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.stories.map((s: { id: string }) => s.id)).toEqual(['s1', 's2']);
    expect(result.tab).toBe('todas');
  });

  it('?tab=revision filters by pendiente status and echoes the tab back', async () => {
    const supabase = makeSupabase({
      stories: [
        story({}),
        story({ id: 's2', status: 'pendiente', title: 'En cola' }),
        story({ id: 's3', status: 'borrador', title: 'Boceto' }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase), '?tab=revision'));
    expect(result.tab).toBe('revision');
    expect(result.stories.map((s: { id: string }) => s.id)).toEqual(['s2']);
  });

  it('?tab=mias returns only the stories of the logged-in user’s characters', async () => {
    const supabase = makeSupabase({
      stories: [
        story({}),
        story({
          id: 's-other',
          title: 'El bosque',
          character_id: 'c-legolas',
          character: {
            id: 'c-legolas',
            name: 'Legolas',
            status: 'aprobado',
            player: { id: 'u2', display_name: null, username: 'elrond' },
          },
        }),
      ],
      characters: [{ id: 'c-aragorn', player_id: 'u1' }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, { id: 'u1' }), '?tab=mias'));
    expect(result.tab).toBe('mias');
    expect(result.stories.map((s: { id: string }) => s.id)).toEqual(['s1']);
  });

  it('?tab=mias for a guest returns no stories', async () => {
    const supabase = makeSupabase({ stories: [story({})], characters: [] });
    const result = await loadFn(makeEvent(makeLocals(supabase), '?tab=mias'));
    expect(result.stories).toEqual([]);
  });

  it('?q= by title filters case-insensitively', async () => {
    const supabase = makeSupabase({
      stories: [
        story({}),
        story({ id: 's2', title: 'La Guerra de los Magos' }),
        story({ id: 's3', title: 'Notas sueltas' }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase), '?q=viaje'));
    expect(result.q).toBe('viaje');
    expect(result.stories.map((s: { id: string }) => s.id)).toEqual(['s1']);
  });

  it('?q= by character name returns the stories of matching characters', async () => {
    const supabase = makeSupabase({
      stories: [
        story({}),
        story({
          id: 's-legolas',
          title: 'El bosque encantado',
          character_id: 'c-legolas',
          character: {
            id: 'c-legolas',
            name: 'Legolas',
            status: 'aprobado',
            player: { id: 'u2', display_name: null, username: 'elrond' },
          },
        }),
      ],
      // El ilike por nombre se resuelve contra la tabla `characters`, así que
      // el fixture debe traer los nombres reales para que el mock los filtre.
      characters: [{ id: 'c-legolas', name: 'Legolas' }, { id: 'c-aragorn', name: 'Aragorn' }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase), '?q=lego'));
    expect(result.stories.map((s: { id: string }) => s.id)).toEqual(['s-legolas']);
  });

  it('?q= unions title and character-name matches without duplicates', async () => {
    const supabase = makeSupabase({
      stories: [
        story({ id: 's1', title: 'El bosque oculto' }),
        story({ id: 's2', title: 'La guerra de las sombras' }),
        story({
          id: 's3',
          title: 'Crónica del norte',
          character_id: 'c-sombras',
          character: {
            id: 'c-sombras',
            name: 'Capitán Sombras',
            status: 'aprobado',
            player: { id: 'u2', display_name: null, username: 'gm2' },
          },
        }),
      ],
      characters: [{ id: 'c-sombras', name: 'Capitán Sombras' }],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase), '?q=sombras'));
    expect(result.stories.map((s: { id: string }) => s.id).sort()).toEqual(['s2', 's3']);
  });

  it('exposes counts for the tabs (statuses + mias)', async () => {
    const supabase = makeSupabase({
      stories: [
        story({}),
        story({ id: 's2', status: 'pendiente' }),
        story({ id: 's3', status: 'borrador' }),
      ],
      characters: [],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, { id: 'u1' })));
    // La factory `story()` embebe player { id: 'u1' } en las tres historias, así
    // que para el usuario u1 `mias` debe contar las 3 historias del fixture.
    expect(result.counts).toEqual({
      todas: 3,
      aprobado: 1,
      pendiente: 1,
      borrador: 1,
      mias: 3,
    });
  });

  it('an unknown tab falls back to todas', async () => {
    const supabase = makeSupabase({ stories: [story({})] });
    const result = await loadFn(makeEvent(makeLocals(supabase), '?tab=noexiste'));
    expect(result.tab).toBe('todas');
    expect(result.stories).toHaveLength(1);
  });

  it('declares the canonical tab set', () => {
    expect(STORY_TABS).toEqual(['todas', 'aprobadas', 'revision', 'borradores', 'mias']);
  });
});
