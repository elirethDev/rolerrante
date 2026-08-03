/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { load, actions } from './+page.server';
import type { Mock } from 'vitest';

// The service_role helper must degrade to null (no key) in tests so the loader
// never makes a real network call. Provide a stubbed module.
vi.mock('$lib/supabase/serviceRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/supabase/serviceRole')>();
  return {
    ...actual,
    getServiceRoleClient: vi.fn(() => null),
    getLastAuditAction: vi.fn(async () => null),
  };
});

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actionFn = (name: string) => actions[name] as unknown as (args: any) => Promise<any>;

interface Row {
  id: string;
  created_at: string;
  [k: string]: unknown;
}

/** Approved KPI rows only need created_at/reviewed_at (no id). */
type ApprovedRow = { created_at: string; reviewed_at: string | null };

function makeSupabase(fixture: {
  characters?: Row[];
  stories?: Row[];
  events?: Row[];
  skill_requests?: Row[];
  // status ⇒ rows for KPI-approved queries (status='aprobado')
  approved?: { characters?: ApprovedRow[]; stories?: ApprovedRow[]; skill_requests?: ApprovedRow[] };
  rpc?: Record<string, Mock>;
}) {
  const rpc = fixture.rpc ?? {};
  const approved = fixture.approved ?? {};
  const from = (table: string) => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (col: string, val: string) => {
        if (col === 'status' && val === 'aprobado') {
          // approved KPI rows come from the approved fixture
          b.data = approved[table as 'characters'] ?? [];
        }
        return b;
      },
      not: () => b,
      order: () => b,
      limit: () => b,
      then: (res: Handler, rej: Handler) => {
        let data: unknown = b.data;
        if (data === undefined) {
          if (table === 'characters') data = fixture.characters ?? [];
          else if (table === 'stories') data = fixture.stories ?? [];
          else if (table === 'events') data = fixture.events ?? [];
          else data = fixture.skill_requests ?? [];
        }
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return b;
  };
  return {
    from,
    rpc: (name: string, params: unknown) => {
      const mock = rpc[name];
      if (mock) mock(params);
      return { error: rpc[name] ? null : { message: `no rpc ${name}` } };
    },
  };
}

type Handler = (...args: unknown[]) => void;

const row = (p: Partial<Row> & { id: string }): Row => ({ created_at: '2026-08-03T10:00:00.000Z', ...p });

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role: string = 'gm') =>
  ({ supabase, profile: { id: 'u1', role } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>, fd?: FormData) => ({
  locals,
  url: new URL('http://localhost/gm'),
  request: fd ? { formData: async () => fd } : undefined,
  params: {},
}) as never;

const makeForm = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
};

describe('gm/+page.server.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('load() aggregation', () => {
    it('builds a unified queue from all four pending sources with analytics KPI', async () => {
      const supabase = makeSupabase({
        characters: [row({ id: 'c1', name: 'Ficha A', player: { display_name: 'Syl' } })],
        stories: [row({ id: 's1', title: 'Cronica B', character: { player: { display_name: 'Arth' } } })],
        events: [row({ id: 'e1', title: 'Evento C', creator: { display_name: 'Jaina' } })],
        skill_requests: [row({ id: 'r1', character: { name: 'Char D', player: { display_name: 'Thrall' } } })],
      });
      const result = await loadFn(makeEvent(makeLocals(supabase, 'gm')));
      expect(result.queue).toHaveLength(4);
      const types = result.queue.map((i: { type: string }) => i.type).sort();
      expect(types).toEqual(['cronica', 'evento', 'ficha', 'solicitud']);
      expect(result.kpi).toEqual({
        pendientes: 4,
        aprobadasHoy: 0,
        tiempoMedio: 0,
        antiguedad48h: 0,
      });
      // service_role degraded (no key) → banner null, analytics unaffected
      expect(result.lastAction).toBeNull();
    });

    it('denies non-GM/non-admin profiles', async () => {
      const supabase = makeSupabase({ characters: [] });
      await expect(loadFn(makeEvent(makeLocals(supabase, 'rolero')))).rejects.toMatchObject({
        status: 403,
      });
    });

    it('computes approved-today and avg review time from approved rows', async () => {
      const supabase = makeSupabase({
        characters: [row({ id: 'c1', name: 'A', player: { display_name: 'Syl' } })],
        stories: [],
        events: [],
        skill_requests: [],
        approved: {
          characters: [
            { created_at: '2026-08-01T00:00:00.000Z', reviewed_at: '2026-08-03T09:00:00.000Z' },
            { created_at: '2026-08-01T08:00:00.000Z', reviewed_at: '2026-08-03T09:00:00.000Z' },
          ],
        },
      });
      const result = await loadFn(makeEvent(makeLocals(supabase, 'gm')));
      expect(result.kpi).toEqual({
        pendientes: 1,
        aprobadasHoy: 2,
        tiempoMedio: 53,
        antiguedad48h: 0,
      });
    });
  });

  describe('actions disambiguation', () => {
    it('approve routes by entity type to the matching existing RPC', async () => {
      const rpc = {
        approve_character: vi.fn().mockReturnValue({ error: null }),
        approve_story: vi.fn().mockReturnValue({ error: null }),
        approve_skill_request: vi.fn().mockReturnValue({ error: null }),
        finalize_event: vi.fn().mockReturnValue({ error: null }),
      };
      const supabase = makeSupabase({ rpc });
      const locals = makeLocals(supabase, 'gm');

      await actionFn('approve')(makeEvent(locals, makeForm({ entityType: 'ficha', entityId: 'c1' })));
      expect(rpc.approve_character).toHaveBeenCalledWith({ p_character_id: 'c1' });

      await actionFn('approve')(makeEvent(locals, makeForm({ entityType: 'cronica', entityId: 's1' })));
      expect(rpc.approve_story).toHaveBeenCalledWith({ p_story_id: 's1' });

      await actionFn('approve')(makeEvent(locals, makeForm({ entityType: 'solicitud', entityId: 'r1' })));
      expect(rpc.approve_skill_request).toHaveBeenCalledWith({ p_request_id: 'r1' });

      await actionFn('approve')(makeEvent(locals, makeForm({ entityType: 'evento', entityId: 'e1', xp: '5' })));
      expect(rpc.finalize_event).toHaveBeenCalledWith({ p_event_id: 'e1', p_xp_per_participant: 5 });
    });

    it('reject routes by entity type passing through notes', async () => {
      const rpc = {
        reject_character: vi.fn().mockReturnValue({ error: null }),
        reject_story: vi.fn().mockReturnValue({ error: null }),
        reject_skill_request: vi.fn().mockReturnValue({ error: null }),
      };
      const supabase = makeSupabase({ rpc });
      const locals = makeLocals(supabase, 'gm');

      await actionFn('reject')(makeEvent(locals, makeForm({ entityType: 'ficha', entityId: 'c1', notes: 'n' })));
      expect(rpc.reject_character).toHaveBeenCalledWith({ p_character_id: 'c1', p_notes: 'n' });

      await actionFn('reject')(makeEvent(locals, makeForm({ entityType: 'cronica', entityId: 's1', notes: 'n' })));
      expect(rpc.reject_story).toHaveBeenCalledWith({ p_story_id: 's1', p_notes: 'n' });
    });

    it('rejecting an event (no RPC) fails with 400 instead of calling a non-existent RPC', async () => {
      const rpc = {};
      const supabase = makeSupabase({ rpc });
      const res = await actionFn('reject')(makeEvent(makeLocals(supabase, 'gm'), makeForm({ entityType: 'evento', entityId: 'e1' })));
      expect(res.status).toBe(400);
      expect(res.data).toEqual({ message: 'Acción no soportada para este tipo' });
    });

    it('denies non-GM/non-admin on actions', async () => {
      const rpc = { approve_character: vi.fn().mockReturnValue({ error: null }) };
      const supabase = makeSupabase({ rpc });
      await expect(
        actionFn('approve')(makeEvent(makeLocals(supabase, 'rolero'), makeForm({ entityType: 'ficha', entityId: 'c1' })))
      ).rejects.toMatchObject({ status: 403 });
    });
  });
});
