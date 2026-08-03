import { error, fail } from '@sveltejs/kit';
import { isGMOrAdmin } from '$lib/auth';
import type { UserRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

const ROLES: UserRole[] = ['pendiente', 'rolero', 'gm', 'admin'];

function requireStaff(role?: UserRole | null) {
  if (!isGMOrAdmin(role ?? null)) throw error(403, 'Acceso denegado');
}

export const load: PageServerLoad = async ({ locals, params }) => {
  requireStaff(locals.profile?.role);

  const threadId = params.threadId;
  const [{ data: thread }, { data: threadPermissions }] = await Promise.all([
    locals.supabase.from('threads').select('*').eq('id', threadId).maybeSingle(),
    locals.supabase.from('thread_permissions').select('*').eq('thread_id', threadId),
  ]);
  if (!thread) throw error(404, 'Hilo no encontrado');

  return { thread, threadPermissions: threadPermissions ?? [] };
};

export const actions: Actions = {
  // Thread permission toggles (REQ-FORUM-04.2/04.4), audited with editar_permisos
  setThreadPermissions: async ({ request, locals, params }) => {
    requireStaff(locals.profile?.role);
    const threadId = params.threadId;
    const form = await request.formData();
    const role = String(form.get('role') ?? '') as UserRole;
    if (!ROLES.includes(role)) return fail(400, { message: 'Datos de permiso inválidos' });
    const flags = {
      can_view: form.get('can_view') === 'on',
      can_post: form.get('can_post') === 'on',
      can_edit: form.get('can_edit') === 'on',
      can_lock: form.get('can_lock') === 'on',
    };

    const { error: dbError } = await locals.supabase
      .from('thread_permissions')
      .upsert({ thread_id: threadId, role, ...flags });
    if (dbError) return fail(400, { message: dbError.message });

    await locals.supabase.rpc('log_audit', {
      p_action: 'editar_permisos',
      p_entity_type: 'thread',
      p_entity_id: threadId,
      p_details: { role, ...flags },
    });
    return { success: true };
  },

  // Lock / reopen (REQ-FORUM-04.3): GM/admin only, author can never lock their own thread
  lock: async ({ locals, params }) => {
    requireStaff(locals.profile?.role);
    const threadId = params.threadId;
    const { data: thread } = await locals.supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();
    if (!thread) throw error(404, 'Hilo no encontrado');
    if (thread.author_id === locals.profile?.id) {
      throw error(403, 'El autor no puede bloquear su propio hilo');
    }
    if (thread.is_locked) return { success: true };

    const { error: dbError } = await locals.supabase
      .from('threads')
      .update({ is_locked: true, locked_by: locals.profile?.id, locked_at: new Date().toISOString() })
      .eq('id', threadId);
    if (dbError) return fail(400, { message: dbError.message });

    await locals.supabase.rpc('log_audit', {
      p_action: 'bloquear_hilo',
      p_entity_type: 'thread',
      p_entity_id: threadId,
      p_details: { thread_id: threadId },
    });
    return { success: true };
  },

  unlock: async ({ locals, params }) => {
    requireStaff(locals.profile?.role);
    const threadId = params.threadId;
    const { data: thread } = await locals.supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();
    if (!thread) throw error(404, 'Hilo no encontrado');
    if (thread.author_id === locals.profile?.id) {
      throw error(403, 'El autor no puede desbloquear su propio hilo');
    }
    if (!thread.is_locked) return { success: true };

    const { error: dbError } = await locals.supabase
      .from('threads')
      .update({ is_locked: false, locked_by: null, locked_at: null })
      .eq('id', threadId);
    if (dbError) return fail(400, { message: dbError.message });

    await locals.supabase.rpc('log_audit', {
      p_action: 'desbloquear_hilo',
      p_entity_type: 'thread',
      p_entity_id: threadId,
      p_details: { thread_id: threadId },
    });
    return { success: true };
  },
};
