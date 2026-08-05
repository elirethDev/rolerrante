import { describe, expect, it } from 'vitest';
import {
  buildWorklist,
  computeKpis,
  displayName,
  isStale,
  resolveActionRpc,
  STALE_MS,
} from './worklist';

const OLD = '2026-07-01T00:00:00.000Z'; // far in the past → stale
const NOW_STR = '2026-08-03T12:00:00.000Z';
const NOW = new Date(NOW_STR).getTime();
const TODAY = '2026-08-03T09:00:00.000Z';
const YESTERDAY = '2026-08-02T09:00:00.000Z';

describe('worklist pure logic', () => {
  describe('displayName', () => {
    it('returns display_name when present', () => {
      expect(displayName({ display_name: 'Azeroth', username: 'az' })).toBe('Azeroth');
    });
    it('falls back to username when display_name is null/missing', () => {
      expect(displayName({ display_name: null, username: 'az' })).toBe('az');
      expect(displayName({ username: 'az' })).toBe('az');
    });
    it('returns empty string for null/undefined/empty profile', () => {
      expect(displayName(null)).toBe('');
      expect(displayName(undefined)).toBe('');
    });
  });

  describe('isStale', () => {
    it('flags items older than 48h', () => {
      const past = new Date(NOW - STALE_MS - 1000).toISOString();
      expect(isStale(past, NOW)).toBe(true);
    });
    it('does not flag recent items within 48h', () => {
      const recent = new Date(NOW - STALE_MS + 1000).toISOString();
      expect(isStale(recent, NOW)).toBe(false);
    });
  });

  describe('buildWorklist', () => {
    it('maps all four entity types into a unified queue sorted by submission date', () => {
      const queue = buildWorklist({
        characters: [
          { id: 'c1', name: 'Ficha A', created_at: '2026-08-01T00:00:00.000Z', player: { display_name: 'Syl', username: 'sy' } },
        ],
        stories: [
          { id: 's1', title: 'Cronica B', created_at: '2026-08-02T00:00:00.000Z', character: { player: { display_name: 'Arth', username: 'ar' } } },
        ],
        events: [
          { id: 'e1', title: 'Evento C', created_at: OLD, creator: { display_name: 'Jaina' } },
        ],
        skillRequests: [
          { id: 'r1', created_at: '2026-08-03T00:00:00.000Z', character: { name: 'Char D', player: { display_name: 'Thrall' } } },
        ],
      });

      expect(queue).toHaveLength(4);
      // sorted oldest → newest: e1 (Jul 1), c1 (Aug 1), s1 (Aug 2), r1 (Aug 3)
      expect(queue.map((i) => i.id).join(',')).toBe('e1,c1,s1,r1');
      // entity fields populated
      const ficha = queue.find((i) => i.id === 'c1');
      expect(ficha?.type).toBe('ficha');
      expect(ficha?.author).toBe('Syl');
      expect(ficha?.detailHref).toBe('/personajes/c1');
      expect(ficha?.stale).toBe(true); // c1 created Aug 1 → stale by Aug 3
      const evento = queue.find((i) => i.id === 'e1');
      expect(evento?.type).toBe('evento');
      expect(evento?.stale).toBe(true); // event created Jul 1 → stale
      expect(evento?.detailHref).toBe('/eventos/e1');
      const sol = queue.find((i) => i.id === 'r1');
      expect(sol?.type).toBe('solicitud');
      expect(sol?.name).toBe('Char D');
      expect(sol?.detailHref).toBe('/gm/solicitudes/r1');
    });

    it('handles empty queues producing an empty sorted list', () => {
      const queue = buildWorklist({ characters: [], stories: [], events: [], skillRequests: [] });
      expect(queue).toHaveLength(0);
    });
  });

  describe('computeKpis', () => {
    it('counts pendientes, approved today, avg review hours, and stale >48h', () => {
      const pending = buildWorklist({
        characters: [{ id: 'c1', name: 'A', created_at: OLD, player: { display_name: 'x' } }],
        stories: [],
        events: [],
        skillRequests: [],
      });
      const kpi = computeKpis(
        pending,
        [
          { created_at: '2026-08-01T00:00:00.000Z', reviewed_at: TODAY }, // 57h
          { created_at: '2026-08-01T08:00:00.000Z', reviewed_at: TODAY }, // 49h → avg 53
        ],
        NOW
      );
      expect(kpi.pendientes).toBe(1);
      expect(kpi.aprobadasHoy).toBe(2);
      expect(kpi.tiempoMedio).toBe(53);
      expect(kpi.antiguedad48h).toBe(1);
    });

    it('approved not today are excluded from approved-today but still count toward avg', () => {
      const kpi = computeKpis([], [{ created_at: '2026-08-01T00:00:00.000Z', reviewed_at: YESTERDAY }], NOW);
      expect(kpi.aprobadasHoy).toBe(0);
      expect(kpi.tiempoMedio).toBe(33); // 33h elapsed
    });

    it('returns zeros and no error when there are no approved rows', () => {
      const kpi = computeKpis([], [], NOW);
      expect(kpi.pendientes).toBe(0);
      expect(kpi.aprobadasHoy).toBe(0);
      expect(kpi.tiempoMedio).toBe(0);
      expect(kpi.antiguedad48h).toBe(0);
    });
  });

  describe('resolveActionRpc', () => {
    it('maps approve to the matching existing RPC per entity type', () => {
      expect(resolveActionRpc('ficha', 'approve', 'c1')).toEqual({
        rpc: 'approve_character',
        params: { p_character_id: 'c1' },
      });
      expect(resolveActionRpc('cronica', 'approve', 's1')).toEqual({
        rpc: 'approve_story',
        params: { p_story_id: 's1' },
      });
      expect(resolveActionRpc('solicitud', 'approve', 'r1')).toEqual({
        rpc: 'approve_skill_request',
        params: { p_request_id: 'r1' },
      });
    });

    it('approve passes through an optional note for ficha/cronica/solicitud', () => {
      expect(resolveActionRpc('ficha', 'approve', 'c1', { notes: 'n' })).toEqual({
        rpc: 'approve_character',
        params: { p_character_id: 'c1', p_notes: 'n' },
      });
      expect(resolveActionRpc('cronica', 'approve', 's1', { notes: 'n' })).toEqual({
        rpc: 'approve_story',
        params: { p_story_id: 's1', p_notes: 'n' },
      });
      expect(resolveActionRpc('solicitud', 'approve', 'r1', { notes: 'n' })).toEqual({
        rpc: 'approve_skill_request',
        params: { p_request_id: 'r1', p_notes: 'n' },
      });
    });

    it('approve without notes keeps the lean params (no p_notes key)', () => {
      expect(resolveActionRpc('ficha', 'approve', 'c1')).toEqual({
        rpc: 'approve_character',
        params: { p_character_id: 'c1' },
      });
    });

    it('event approve never receives notes (finalize_event has no p_notes)', () => {
      expect(resolveActionRpc('evento', 'approve', 'e1', { xp: 3, notes: 'n' })).toEqual({
        rpc: 'finalize_event',
        params: { p_event_id: 'e1', p_xp_per_participant: 3 },
      });
    });

    it('maps event approve to finalize_event passing through xp', () => {
      expect(resolveActionRpc('evento', 'approve', 'e1', { xp: 5 })).toEqual({
        rpc: 'finalize_event',
        params: { p_event_id: 'e1', p_xp_per_participant: 5 },
      });
      // xp omitted -> default 0 (server contract: event approve never omits it)
      expect(resolveActionRpc('evento', 'approve', 'e1')).toEqual({
        rpc: 'finalize_event',
        params: { p_event_id: 'e1', p_xp_per_participant: 0 },
      });
    });

    it('maps reject to matching RPC passing through notes', () => {
      expect(resolveActionRpc('ficha', 'reject', 'c1', { notes: 'n' })).toEqual({
        rpc: 'reject_character',
        params: { p_character_id: 'c1', p_notes: 'n' },
      });
      expect(resolveActionRpc('cronica', 'reject', 's1', { notes: 'n' })).toEqual({
        rpc: 'reject_story',
        params: { p_story_id: 's1', p_notes: 'n' },
      });
    });

    it('returns null for event reject (no existing reject_event RPC)', () => {
      expect(resolveActionRpc('evento', 'reject', 'e1')).toBeNull();
    });

    it('returns null for unknown entity type', () => {
      // @ts-expect-error intentionally passing an invalid type
      expect(resolveActionRpc('bogus', 'approve', 'x')).toBeNull();
    });
  });
});
