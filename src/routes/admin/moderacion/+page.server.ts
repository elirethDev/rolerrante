import { error, fail } from '@sveltejs/kit';
import { listReports, resolveReport, suspendUser as suspendUserRpc, banUser as banUserRpc } from '$lib/forum';
import { isGMOrAdmin, isAdmin, listActiveSanctions } from '$lib/auth';
import type { UserRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

function requireStaff(role?: UserRole | null) {
  if (!isGMOrAdmin(role ?? null)) throw error(403, 'Acceso denegado');
}

// Enforcement (reports + sanctions) is admin-only per spec REQ-MOD-REP-02 /
// REQ-MOD-ENF-01/02. GM keeps pending-thread review (REQ-FORUM-05) but sees a
// read-only report queue.
function requireAdmin(role?: UserRole | null) {
  if (!isAdmin(role ?? null)) throw error(403, 'Acceso denegado');
}

export const load: PageServerLoad = async ({ locals }) => {
  requireStaff(locals.profile?.role);

  const [{ data: pendingThreads }, { data: eventThreads }, reportsResult] = await Promise.all([
    // Pending bridged story/character threads awaiting approval (REQ-FORUM-05.1)
    locals.supabase
      .from('threads')
      .select('*')
      .eq('status', 'pendiente')
      .in('content_type', ['historia', 'ficha'])
      .order('created_at', { ascending: false })
      .limit(100),
    // Bridged event threads - review only applies once their event is finalized (REQ-FORUM-05.3)
    locals.supabase
      .from('threads')
      .select('*')
      .eq('content_type', 'evento')
      .not('linked_entity_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
    // Independent report queue (REQ-MOD-REP-02.3) - separate from pending approvals.
    listReports(locals.supabase),
  ]);

  const reports = reportsResult.data ?? [];
  // Active sanctions for the reported users, keyed by user_id, so the UI can
  // show sanction state (REQ-MOD-ENF-03) and block admin/GM targets (ENF-04).
  const reportedIds = reports.flatMap((r) => (r.post?.author?.id ? [r.post.author.id] : []));
  const sanctions = await listActiveSanctions(locals.supabase, reportedIds);

  return {
    pendingThreads: pendingThreads ?? [],
    eventThreads: eventThreads ?? [],
    reports,
    sanctions,
    isAdmin: isAdmin(locals.profile?.role ?? null),
  };
};

export const actions: Actions = {
  // Approve a pending bridged story/character thread (REQ-FORUM-05.1/05.2).
  // The underlying entity is approved via the existing RPC; the bridged thread is
  // then flipped to 'aprobado' so it becomes publicly visible.
  approveThread: async ({ request, locals }) => {
    requireStaff(locals.profile?.role);
    const form = await request.formData();
    const threadId = String(form.get('threadId') ?? '');
    if (!threadId) return fail(400, { message: 'Hilo obligatorio' });
    const { data: thread } = await locals.supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();
    if (!thread) throw error(404, 'Hilo no encontrado');
    if (thread.status !== 'pendiente') return fail(400, { message: 'El hilo no está pendiente de revisión' });

    const entityId = thread.linked_entity_id;
    if (thread.content_type === 'historia' && entityId) {
      const { error: rpcError } = await locals.supabase.rpc('approve_story', { p_story_id: entityId, p_notes: '' });
      if (rpcError) return fail(400, { message: rpcError.message });
    } else if (thread.content_type === 'ficha' && entityId) {
      const { error: rpcError } = await locals.supabase.rpc('approve_character', { p_character_id: entityId, p_notes: '' });
      if (rpcError) return fail(400, { message: rpcError.message });
    } else {
      return fail(400, { message: 'El hilo no está vinculado a una historia o personaje' });
    }

    const { error: upErr } = await locals.supabase
      .from('threads')
      .update({ status: 'aprobado' })
      .eq('id', threadId);
    if (upErr) return fail(400, { message: upErr.message });
    return { success: true };
  },

  rejectThread: async ({ request, locals }) => {
    requireStaff(locals.profile?.role);
    const form = await request.formData();
    const threadId = String(form.get('threadId') ?? '');
    if (!threadId) return fail(400, { message: 'Hilo obligatorio' });
    const { data: thread } = await locals.supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();
    if (!thread) throw error(404, 'Hilo no encontrado');
    if (thread.status !== 'pendiente') return fail(400, { message: 'El hilo no está pendiente de revisión' });

    const entityId = thread.linked_entity_id;
    if (thread.content_type === 'historia' && entityId) {
      const { error: rpcError } = await locals.supabase.rpc('reject_story', { p_story_id: entityId, p_notes: 'Rechazado desde la moderación del foro' });
      if (rpcError) return fail(400, { message: rpcError.message });
    } else if (thread.content_type === 'ficha' && entityId) {
      const { error: rpcError } = await locals.supabase.rpc('reject_character', { p_character_id: entityId, p_notes: 'Rechazado desde la moderación del foro' });
      if (rpcError) return fail(400, { message: rpcError.message });
    } else {
      return fail(400, { message: 'El hilo no está vinculado a una historia o personaje' });
    }

    const { error: upErr } = await locals.supabase
      .from('threads')
      .update({ status: 'rechazado' })
      .eq('id', threadId);
    if (upErr) return fail(400, { message: upErr.message });
    return { success: true };
  },

  // Event review only when the underlying event is finalized (REQ-FORUM-05.3).
  reviewEvent: async ({ request, locals }) => {
    requireStaff(locals.profile?.role);
    const form = await request.formData();
    const threadId = String(form.get('threadId') ?? '');
    if (!threadId) return fail(400, { message: 'Hilo obligatorio' });
    const { data: thread } = await locals.supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();
    if (!thread) throw error(404, 'Hilo no encontrado');
    if (thread.content_type !== 'evento' || !thread.linked_entity_id) {
      return fail(400, { message: 'El hilo no es un evento' });
    }

    const { data: event } = await locals.supabase
      .from('events')
      .select('*')
      .eq('id', thread.linked_entity_id)
      .single();
    if (event?.status !== 'finalizado') {
      return fail(400, { message: 'El evento debe estar finalizado para su revisión' });
    }

    const { error: rpcError } = await locals.supabase.rpc('confirm_event_completion', {
      p_event_id: thread.linked_entity_id,
      p_notes: 'Revisión desde la moderación del foro',
    });
    if (rpcError) return fail(400, { message: rpcError.message });
    return { success: true };
  },

  // Resolve or discard an open report (REQ-MOD-REP-02.2). Both call the
  // resolve_report RPC; the status differentiates resuelta vs descartada.
  // Admin-only: GM sees a read-only queue (REQ-MOD-REP-02.1).
  resolveReport: async ({ request, locals }) => {
    requireAdmin(locals.profile?.role);
    return runReportResolution(request, locals, 'resuelta');
  },

  discardReport: async ({ request, locals }) => {
    requireAdmin(locals.profile?.role);
    return runReportResolution(request, locals, 'descartada');
  },

  // Temporarily suspend the reported author (REQ-MOD-ENF-01). Admin-only.
  suspendUser: async ({ request, locals }) => {
    requireAdmin(locals.profile?.role);
    return runSanction(locals, request, 'suspend');
  },

  // Permanently ban the reported author (REQ-MOD-ENF-02). Admin-only.
  banUser: async ({ request, locals }) => {
    requireAdmin(locals.profile?.role);
    return runSanction(locals, request, 'ban');
  },
};

async function runReportResolution(
  request: Request,
  locals: { supabase: Parameters<typeof resolveReport>[0] },
  status: 'resuelta' | 'descartada',
) {
  const form = await request.formData();
  const reportId = String(form.get('reportId') ?? '');
  const justification = String(form.get('justification') ?? '').trim();

  if (!reportId) return fail(400, { message: 'Reporte obligatorio' });
  if (!justification) return fail(400, { message: 'La justificación es obligatoria' });

  const result = await resolveReport(locals.supabase, reportId, status, justification);
  if (result.error) return fail(400, { message: result.error });
  return { success: true };
}

interface SanctionLocals {
  supabase: Parameters<typeof suspendUserRpc>[0];
}

/**
 * Shared suspend/ban enforcement (REQ-MOD-ENF-01/02). Validates the target is
 * not an admin/GM (ENF-04) at the app layer as a defence-in-depth guard, then
 * delegates to the admin-only SECURITY DEFINER RPC, which is authoritative.
 * Surfaces RPC/server rejection messages back to the form.
 */
async function runSanction(
  locals: SanctionLocals,
  request: Request,
  kind: 'suspend' | 'ban',
) {
  const form = await request.formData();
  const userId = String(form.get('userId') ?? '').trim();
  const justification = String(form.get('justification') ?? '').trim();
  const durationDays = Number(form.get('duration') ?? '');

  if (!userId) return fail(400, { message: 'Usuario obligatorio' });
  if (!justification) return fail(400, { message: 'La justificación es obligatoria' });
  if (kind === 'suspend' && (!Number.isInteger(durationDays) || durationDays <= 0)) {
    return fail(400, { message: 'La duración de la suspensión es obligatoria' });
  }

  // ENF-04 app-layer guard (SQL RPC remains the authoritative backstop).
  const { data: target } = await locals.supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (target && isGMOrAdmin((target as { role: UserRole }).role)) {
    return fail(400, { message: 'No se puede sancionar a un GM o admin' });
  }

  const result =
    kind === 'suspend'
      ? await suspendUserRpc(
          locals.supabase,
          userId,
          new Date(Date.now() + durationDays * 86_400_000).toISOString(),
          justification,
        )
      : await banUserRpc(locals.supabase, userId, justification);
  if (result.error) return fail(400, { message: result.error });
  return { success: true };
}
