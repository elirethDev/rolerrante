/**
 * GM worklist server-side pure logic (design #280 AD-1/AD-2, spec R1-R5).
 * Pure functions only: no I/O, no supabase — trivially unit-testable without mocks.
 */
import type { GmKpi, WorklistItem, WorklistItemType } from '../components/gm/types';

/** Stale threshold: an item older than 48h is flagged (spec gm-analytics R3). */
export const STALE_MS = 48 * 60 * 60 * 1000;

/** Best-effort author display name from a nested player/profile embed. */
export function displayName(
  p: { display_name?: string | null; username?: string } | null | undefined
): string {
  if (!p) return '';
  return p.display_name ?? p.username ?? '';
}

/** A pending item is stale when its createdAt is older than the 48h window. */
export function isStale(createdAt: string, now: number = Date.now()): boolean {
  return now - new Date(createdAt).getTime() > STALE_MS;
}

/** One day boundary check used by "aprobadas hoy". */
function isSameDay(iso: string | null | undefined, now: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date(now);
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

/** Builds the unified pending queue from the four source tables (spec R1). */
export function buildWorklist(input: {
  characters: CharacterRow[];
  stories: StoryRow[];
  events: EventRow[];
  skillRequests: SkillRequestRow[];
}): WorklistItem[] {
  const now = Date.now();
  const items: WorklistItem[] = [];

  for (const c of input.characters ?? []) {
    items.push({
      id: c.id,
      type: 'ficha',
      name: c.name,
      author: displayName(c.player),
      createdAt: c.created_at,
      stale: isStale(c.created_at, now),
      detailHref: `/personajes/${c.id}`,
      entityId: c.id,
    });
  }
  for (const s of input.stories ?? []) {
    items.push({
      id: s.id,
      type: 'cronica',
      name: s.title,
      author: displayName(s.character?.player),
      createdAt: s.created_at,
      stale: isStale(s.created_at, now),
      detailHref: `/historias/${s.id}`,
      entityId: s.id,
    });
  }
  for (const e of input.events ?? []) {
    items.push({
      id: e.id,
      type: 'evento',
      name: e.title,
      author: displayName(e.creator),
      createdAt: e.created_at,
      stale: isStale(e.created_at, now),
      detailHref: `/eventos/${e.id}`,
      entityId: e.id,
    });
  }
  for (const r of input.skillRequests ?? []) {
    items.push({
      id: r.id,
      type: 'solicitud',
      name: r.character?.name ?? '',
      author: displayName(r.character?.player),
      createdAt: r.created_at,
      stale: isStale(r.created_at, now),
      detailHref: `/gm/solicitudes/${r.id}`,
      entityId: r.id,
    });
  }

  // Sort by submission date ascending (oldest first → oldest pending surfaces first).
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Computes the KPI grid from the pending queue + approved rows (spec gm-analytics R1-R4). */
export function computeKpis(
  pending: WorklistItem[],
  approved: ApprovedRow[],
  now: number = Date.now()
): GmKpi {
  let aprobadasHoy = 0;
  let totalReviewMs = 0;
  let reviewedCount = 0;

  for (const a of approved ?? []) {
    if (isSameDay(a.reviewed_at, now)) aprobadasHoy += 1;
    if (a.created_at && a.reviewed_at) {
      const ms = new Date(a.reviewed_at).getTime() - new Date(a.created_at).getTime();
      if (ms >= 0) {
        totalReviewMs += ms;
        reviewedCount += 1;
      }
    }
  }

  const tiempoMedio =
    reviewedCount > 0 ? Math.round((totalReviewMs / reviewedCount) / (60 * 60 * 1000)) : 0;

  return {
    pendientes: pending.length,
    aprobadasHoy,
    tiempoMedio,
    antiguedad48h: pending.filter((p) => p.stale).length,
  };
}

/** A resolved RPC call: name + params, ready to hand to supabase.rpc(). */
export interface RpcCall {
  rpc:
    | 'approve_character'
    | 'reject_character'
    | 'approve_story'
    | 'reject_story'
    | 'approve_skill_request'
    | 'reject_skill_request'
    | 'finalize_event';
  params: Record<string, unknown>;
}

/**
 * Entity-disambiguated action routing (design AD-2): reuses the existing RPCs,
 * never creates new ones. Returns null when no existing RPC supports the
 * (entityType, action) pair (e.g. rejecting an event — no reject_event RPC).
 */
export function resolveActionRpc(
  entityType: WorklistItemType,
  action: 'approve' | 'reject',
  id: string,
  opts: { notes?: string; xp?: number } = {}
): RpcCall | null {
  const notes = opts.notes ?? '';
  const common: Record<WorklistItemType, { approve: RpcCall; reject: RpcCall | null }> = {
    ficha: {
      approve: { rpc: 'approve_character', params: { p_character_id: id } },
      reject: { rpc: 'reject_character', params: { p_character_id: id, p_notes: notes } },
    },
    cronica: {
      approve: { rpc: 'approve_story', params: { p_story_id: id } },
      reject: { rpc: 'reject_story', params: { p_story_id: id, p_notes: notes } },
    },
    solicitud: {
      approve: { rpc: 'approve_skill_request', params: { p_request_id: id } },
      reject: { rpc: 'reject_skill_request', params: { p_request_id: id, p_notes: notes } },
    },
    evento: {
      approve: {
        rpc: 'finalize_event',
        params: { p_event_id: id, p_xp_per_participant: opts.xp ?? 0 },
      },
      reject: null,
    },
  };

  const entry = common[entityType];
  if (!entry) return null;
  return action === 'approve' ? entry.approve : entry.reject;
}

export interface CharacterRow {
  id: string;
  name: string;
  created_at: string;
  player?: { display_name?: string | null; username?: string } | null;
}
export interface StoryRow {
  id: string;
  title: string;
  created_at: string;
  character?: {
    name?: string | null;
    player?: { display_name?: string | null; username?: string } | null;
  } | null;
}
export interface EventRow {
  id: string;
  title: string;
  created_at: string;
  creator?: { display_name?: string | null; username?: string } | null;
}
export interface SkillRequestRow {
  id: string;
  created_at: string;
  character?: {
    name?: string | null;
    player?: { display_name?: string | null; username?: string } | null;
  } | null;
}
export interface ApprovedRow {
  created_at: string;
  reviewed_at: string | null;
}
