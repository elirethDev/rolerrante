/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load } from './+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

interface CharacterRow {
  id: string;
  name: string;
  age: number | null;
  status: string;
  race_id?: string;
  player_id?: string;
  race?: { name: string } | null;
  player?: { display_name: string | null; username: string } | null;
}

// Fluent supabase mock mirroring foro.server.test.ts: records the predicates the
// load applies (status/q/race/player) and resolves the fixture with those applied,
// so the tests prove BOTH the query shape AND the data contract.
function makeSupabase(fixture: {
  characters?: CharacterRow[];
  races?: Array<{ id: string; name: string }>;
}) {
  const from = (table: string) => {
    const eqs: Array<[string, unknown]> = [];
    const ilikes: Array<[string, string]> = [];
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (col: string, val: unknown) => {
        eqs.push([col, val]);
        return b;
      },
      ilike: (col: string, pattern: string) => {
        ilikes.push([col, pattern]);
        return b;
      },
      order: () => b,
      then: (res: Handler, rej: Handler) => {
        let data: unknown;
        if (table === 'races') {
          data = fixture.races ?? [];
        } else if (table === 'characters') {
          let rows = [...(fixture.characters ?? [])];
          for (const [col, val] of eqs) {
            if (col === 'status') rows = rows.filter((r) => r.status === val);
            if (col === 'race_id') rows = rows.filter((r) => r.race_id === val);
            if (col === 'player_id') rows = rows.filter((r) => r.player_id === val);
          }
          for (const [col, pattern] of ilikes) {
            const needle = pattern.replace(/^%/, '').replace(/%$/, '').toLowerCase();
            rows = rows.filter((r) => {
              const field = col === 'name' ? r.name : '';
              return field.toLowerCase().includes(needle);
            });
          }
          data = rows;
        } else {
          data = [];
        }
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return b;
  };
  return { from };
}
type Handler = (...args: unknown[]) => void;

const char = (p: Partial<CharacterRow>): CharacterRow => ({
  id: 'c1',
  name: 'Aragorn',
  age: 87,
  status: 'aprobado',
  race_id: 'r-humano',
  player_id: 'u-1',
  race: { name: 'Humanos' },
  player: { display_name: 'Pablo', username: 'pablo' },
  ...p,
});

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  user: { id: string } | null = null,
) => ({ supabase, user, profile: user ? { id: user.id, role: 'rolero' } : null }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, query = '') =>
  ({ locals, url: new URL(`http://localhost/personajes${query}`), params: {} }) as never;

describe('personajes index load() — public realm census (design personajes.html)', () => {
  it('lets a guest read the census without redirecting, seeing approved characters from all players', async () => {
    const supabase = makeSupabase({
      characters: [char({ id: 'c1', player_id: 'u-1' }), char({ id: 'c2', name: 'Legolas', player_id: 'u-2' })],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.characters.map((c: { id: string }) => c.id)).toEqual(['c1', 'c2']);
    expect(result.profile).toBeNull();
  });

  it('only asks for approved characters, so drafts/pending never leak into the census', async () => {
    const supabase = makeSupabase({
      characters: [
        char({ id: 'pub', status: 'aprobado' }),
        char({ id: 'borrador', status: 'borrador' }),
        char({ id: 'pendiente', status: 'pendiente' }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    const ids = result.characters.map((c: { id: string }) => c.id);
    expect(ids).toContain('pub');
    expect(ids).not.toContain('borrador');
    expect(ids).not.toContain('pendiente');
  });

  it('?q= filters the census by name via ILIKE and echoes the query back', async () => {
    const supabase = makeSupabase({
      characters: [char({ id: 'c1' }), char({ id: 'c2', name: 'Legolas' })],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase), '?q=leg'));
    expect(result.query).toBe('leg');
    expect(result.characters.map((c: { name: string }) => c.name)).toEqual(['Legolas']);
  });

  it('?race= filters the census by race_id and echoes the selection back', async () => {
    const supabase = makeSupabase({
      characters: [
        char({ id: 'c1', race_id: 'r-humano' }),
        char({ id: 'c2', name: 'Legolas', race_id: 'r-elfo', race: { name: 'Altos Elfos' } }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase), '?race=r-elfo'));
    expect(result.race).toBe('r-elfo');
    expect(result.characters.map((c: { id: string }) => c.id)).toEqual(['c2']);
  });

  it('loads the race list for the filter dropdown', async () => {
    const supabase = makeSupabase({
      races: [
        { id: 'r1', name: 'Humanos' },
        { id: 'r2', name: 'Altos Elfos' },
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase)));
    expect(result.races).toHaveLength(2);
  });

  it('keeps own-character management reachable for a logged-in player, separate from the census', async () => {
    const supabase = makeSupabase({
      characters: [
        char({ id: 'mine-pub', player_id: 'me', status: 'aprobado' }),
        char({ id: 'mine-draft', player_id: 'me', status: 'borrador' }),
        char({ id: 'other', name: 'Legolas', player_id: 'u-2', status: 'aprobado' }),
      ],
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, { id: 'me' })));
    // Census = approved by all players (own approved included, own draft excluded).
    expect(result.characters.map((c: { id: string }) => c.id)).toEqual(['mine-pub', 'other']);
    // Own management shows the player's own characters of any status.
    const own = result.ownCharacters.map((c: { id: string }) => c.id);
    expect(own).toContain('mine-pub');
    expect(own).toContain('mine-draft');
    expect(result.profile).toEqual({ id: 'me', role: 'rolero' });
  });
});
