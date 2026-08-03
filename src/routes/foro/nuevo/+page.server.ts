import { fail, redirect } from '@sveltejs/kit';
import { requireAuth, validateForumImageUrls } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user, profile } }) => {
  requireAuth({ user, profile });
  const { data: categories } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  return { categories: categories ?? [] };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const title = String(form.get('title') ?? '').trim();
    const content = String(form.get('content') ?? '').trim();
    const categoryId = String(form.get('category_id') ?? '');

    if (!title || !content || !categoryId) {
      return fail(400, { message: 'Título, contenido y sección son obligatorios' });
    }

    const imgCheck = validateForumImageUrls(content);
    if (!imgCheck.valid) {
      return fail(400, { message: `Imagen no permitida: ${imgCheck.rejected.join(', ')}` });
    }

    const { data: category } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('id', categoryId)
      .single();
    if (!category) return fail(403, { message: 'Sección inválida' });

    const { data: thread, error } = await supabase
      .from('threads')
      .insert({
        category_id: categoryId,
        content_type: 'debate',
        title,
        body: content,
        author_id: user!.id,
        status: 'abierto',
        is_locked: false,
      })
      .select('id')
      .single();

    if (error) return fail(400, { message: error.message });

    const { error: auditError } = await supabase.rpc('log_audit', {
      p_action: 'crear_hilo',
      p_entity_type: 'thread',
      p_entity_id: thread.id,
      p_details: { title, category_id: categoryId },
    });
    if (auditError) console.error('log_audit falló para crear_hilo', thread.id, auditError);

    throw redirect(303, `/foro/${thread.id}`);
  },
};
