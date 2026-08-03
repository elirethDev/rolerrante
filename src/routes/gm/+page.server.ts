import { error, fail } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { WorklistItemType } from '$lib/components/gm/types';
import { buildWorklist, computeKpis, resolveActionRpc } from '$lib/gm/worklist';
import { getLastAuditAction, getServiceRoleClient } from '$lib/supabase/serviceRole';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const [
    { data: characters },
    { data: stories },
    { data: events },
    { data: skillRequests },
    { data: approvedCharacters },
    { data: approvedStories },
    { data: approvedSkillRequests },
  ] = await Promise.all([
    supabase
      .from('characters')
      .select('*, race:race_id(name), player:player_id!inner(display_name, username)')
      .eq('status', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('stories')
      .select('*, character:character_id!inner(name, player:player_id!inner(display_name, username))')
      .eq('status', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('events')
      .select('*, creator:creator_id!inner(display_name, username)')
      .eq('status', 'finalizacion_pendiente')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('skill_requests')
      .select('*, character:character_id!inner(name, player:player_id!inner(display_name, username))')
      .eq('status', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(50),
    // Approved rows for KPI computation (spec gm-analytics R2: approved_at - created_at).
    supabase
      .from('characters')
      .select('created_at, reviewed_at')
      .eq('status', 'aprobado')
      .not('reviewed_at', 'is', null)
      .limit(200),
    supabase
      .from('stories')
      .select('created_at, reviewed_at')
      .eq('status', 'aprobado')
      .not('reviewed_at', 'is', null)
      .limit(200),
    supabase
      .from('skill_requests')
      .select('created_at, reviewed_at')
      .eq('status', 'aprobado')
      .not('reviewed_at', 'is', null)
      .limit(200),
  ]);

  const queue = buildWorklist({
    characters: characters ?? [],
    stories: stories ?? [],
    events: events ?? [],
    skillRequests: skillRequests ?? [],
  });

  const kpi = computeKpis(queue, [
    ...(approvedCharacters ?? []),
    ...(approvedStories ?? []),
    ...(approvedSkillRequests ?? []),
  ]);

  // Audit last-action banner via service_role (AD-1). Degrades gracefully: when
  // SUPABASE_SERVICE_ROLE_KEY is absent the client is null and the banner is null.
  const auditClient = getServiceRoleClient();
  const lastAction = await getLastAuditAction(auditClient);

  return { queue, kpi, lastAction };
};

const ENTITY_TYPES: ReadonlySet<WorklistItemType> = new Set<WorklistItemType>([
  'ficha',
  'cronica',
  'evento',
  'solicitud',
]);

function parseEntityType(value: string): WorklistItemType | null {
  return (ENTITY_TYPES.has(value as WorklistItemType) ? value : null) as WorklistItemType | null;
}

export const actions: Actions = {
  approve: async ({ request, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');
    const form = await request.formData();
    const entityType = parseEntityType(String(form.get('entityType') ?? ''));
    const entityId = String(form.get('entityId') ?? '');
    const xp = parseInt(String(form.get('xp') ?? '0'), 10);

    if (!entityType || !entityId) return fail(400, { message: 'Datos de entidad inválidos' });

    const call = resolveActionRpc(entityType, 'approve', entityId, { xp });
    if (!call) return fail(400, { message: 'Acción no soportada para este tipo' });

    const { error: rpcError } = await supabase.rpc(call.rpc, call.params as never);
    if (rpcError) return fail(400, { message: rpcError.message });
    return { success: true };
  },

  reject: async ({ request, locals: { supabase, profile } }) => {
    if (!isGMOrAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');
    const form = await request.formData();
    const entityType = parseEntityType(String(form.get('entityType') ?? ''));
    const entityId = String(form.get('entityId') ?? '');
    const notes = String(form.get('notes') ?? '');

    if (!entityType || !entityId) return fail(400, { message: 'Datos de entidad inválidos' });

    const call = resolveActionRpc(entityType, 'reject', entityId, { notes });
    if (!call) return fail(400, { message: 'Acción no soportada para este tipo' });

    const { error: rpcError } = await supabase.rpc(call.rpc, call.params as never);
    if (rpcError) return fail(400, { message: rpcError.message });
    return { success: true };
  },
};
