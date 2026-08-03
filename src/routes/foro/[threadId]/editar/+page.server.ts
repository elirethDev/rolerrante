import { error, fail, redirect } from '@sveltejs/kit';
import { requireAuth, validateForumImageUrls } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, user, profile } }) => {
  requireAuth({ user, profile });

  const { data: thread } = await supabase
    .from('threads')
    .select('*, author:author_id(id, display_name, username)')
    .eq('id', params.threadId)
    .single();

  if (!thread) throw error(404, 'Hilo no encontrado');
  const isOwner = user!.id === (thread as unknown as { author_id: string }).author_id;
  const isStaff = profile?.role === 'gm' || profile?.role === 'admin';
  if (!isOwner && !isStaff) throw error(403, 'No puedes editar este hilo');

  return { thread, isOwner, isStaff };
};

export const actions: Actions = {
  default: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });

    const { data: thread } = await supabase
      .from('threads')
      .select('id, author_id')
      .eq('id', params.threadId)
      .single();
    if (!thread) return fail(404, { message: 'Hilo no encontrado' });

    const isOwner = user!.id === (thread as unknown as { author_id: string }).author_id;
    const isStaff = profile?.role === 'gm' || profile?.role === 'admin';
    if (!isOwner && !isStaff) return fail(403, { message: 'No puedes editar este hilo' });

    const form = await request.formData();
    const title = String(form.get('title') ?? '').trim();
    const content = String(form.get('content') ?? '').trim();
    if (!title || !content) return fail(400, { message: 'Título y contenido son obligatorios' });

    const imgCheck = validateForumImageUrls(content);
    if (!imgCheck.valid) return fail(400, { message: `Imagen no permitida: ${imgCheck.rejected.join(', ')}` });

    const { error: updateError } = await supabase
      .from('threads')
      .update({ title, body: content, edited_by: user!.id, edited_at: new Date().toISOString() })
      .eq('id', params.threadId);
    if (updateError) return fail(400, { message: updateError.message });

    const { error: auditError } = await supabase.rpc('log_audit', {
      p_action: 'editar_post',
      p_entity_type: 'thread',
      p_entity_id: params.threadId,
      p_details: { title },
    });
    if (auditError) console.error('log_audit falló para editar_post', params.threadId, auditError);

    throw redirect(303, `/foro/${params.threadId}`);
  },
};
