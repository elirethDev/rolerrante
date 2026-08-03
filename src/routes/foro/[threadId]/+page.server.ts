import { error, fail, redirect } from '@sveltejs/kit';
import { resolveEffectivePermissions, validateForumImageUrls, requireAuth, type PermissionFlags } from '$lib/auth';
import { getOrCreateThread, type ThreadView, type PostView } from '$lib/forum';
import type { Json } from '$lib/supabase/database.types';
import type { UserRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

type SectionPermRow = { category_id: string; role: UserRole; can_view: boolean; can_post: boolean; can_edit: boolean; can_lock: boolean };
type ThreadPermRow = { thread_id: string; role: UserRole; can_view: boolean; can_post: boolean; can_edit: boolean; can_lock: boolean };

function toFlags(p: { can_view: boolean; can_post: boolean; can_edit: boolean; can_lock: boolean }): PermissionFlags {
  return { can_view: p.can_view, can_post: p.can_post, can_edit: p.can_edit, can_lock: p.can_lock };
}

export const load: PageServerLoad = async ({ params, locals: { supabase, user, profile } }) => {
  const role: UserRole = profile?.role ?? 'pendiente';
  const isStaff = role === 'gm' || role === 'admin';

  const { data: thread } = await supabase
    .from('threads')
    .select('*, author:author_id(id, display_name, username)')
    .eq('id', params.threadId)
    .single();

  if (!thread) throw error(404, 'Hilo no encontrado');

  const t = thread as unknown as ThreadView;
  const isOwner = !!user && user.id === t.author_id;

  // Pending/draft threads are visible only to the owner and staff (REQ-FORUM-02.3).
  const publiclyVisible = t.status === 'abierto' || t.status === 'aprobado';
  if (!publiclyVisible && !isOwner && !isStaff) {
    throw error(404, 'Hilo no encontrado');
  }

  // Lazy bridge: ensure a linked story/character/event has its thread (idempotent).
  let entity: { name: string; status: string } | null = null;
  if (t.linked_entity_type && t.linked_entity_id) {
    const eType = t.linked_entity_type as 'story' | 'character' | 'event';
    await getOrCreateThread(eType, t.linked_entity_id, t.author_id, supabase);
    const table = eType === 'story' ? 'stories' : eType === 'character' ? 'characters' : 'events';
    const col = eType === 'character' ? 'name' : 'title';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await supabase.from(table).select(`${col}, status`).eq('id', t.linked_entity_id).single() as any;
    if (row) {
      entity = {
        name: String((row as Record<string, unknown>)[col] ?? ''),
        status: String((row as Record<string, unknown>).status ?? ''),
      };
    }
  }

  const { data: sectionRows } = await supabase.from('section_permissions').select('*').eq('category_id', t.category_id ?? '');
  const { data: threadRows } = await supabase.from('thread_permissions').select('*').eq('thread_id', t.id);

  const sectionRow = (sectionRows ?? []).find((p) => p.role === role) as SectionPermRow | undefined;
  const threadRow = (threadRows ?? []).find((p) => p.role === role) as ThreadPermRow | undefined;
  const flags = {
    ...resolveEffectivePermissions({
      section: sectionRow ? toFlags(sectionRow) : null,
      thread: threadRow ? toFlags(threadRow) : null,
      role,
    }),
    can_lock: role === 'gm' || role === 'admin',
  };

  const body = (t.body as Json) ?? {};
  const threadBody = typeof body === 'string' ? body : '';

  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:author_id(id, display_name, username), reactions:reactions(post_id, user_id)')
    .eq('thread_id', t.id)
    .order('post_number', { ascending: true });

  // Reaction aggregate + viewer's own like via left-join (REQ-REACT-01.2).
  // Guests still see the count but have no like state (viewer_has_liked null).
  const viewerId = user?.id ?? null;
  const postsWithReactions = (posts ?? []).map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reactions = (p as any).reactions ?? [];
    return {
      ...p,
      like_count: reactions.length,
      viewer_has_liked: viewerId ? reactions.some((r: { user_id: string }) => r.user_id === viewerId) : null,
    };
  });

  return {
    thread: t,
    threadBody,
    posts: postsWithReactions as unknown as PostView[],
    entity,
    flags,
    isLocked: t.is_locked,
    isOwner,
    isStaff,
  };
};

export const actions: Actions = {
  reply: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const role: UserRole = profile?.role ?? 'pendiente';

    const { data: thread } = await supabase
      .from('threads')
      .select('*, author:author_id(id, display_name, username)')
      .eq('id', params.threadId)
      .single();
    if (!thread) throw error(404, 'Hilo no encontrado');
    const t = thread as unknown as ThreadView;

    const { data: sectionRows } = await supabase.from('section_permissions').select('*').eq('category_id', t.category_id ?? '');
    const { data: threadRows } = await supabase.from('thread_permissions').select('*').eq('thread_id', t.id);
    const sectionRow = (sectionRows ?? []).find((p) => (p as { role: string }).role === role);
    const threadRow = (threadRows ?? []).find((p) => (p as { role: string }).role === role);
    const flags = resolveEffectivePermissions({
      section: sectionRow ? toFlags(sectionRow as { can_view: boolean; can_post: boolean; can_edit: boolean; can_lock: boolean }) : null,
      thread: threadRow ? toFlags(threadRow as { can_view: boolean; can_post: boolean; can_edit: boolean; can_lock: boolean }) : null,
      role,
    });

    // Lock gate: locked threads block writes even for can_post (REQ-FORUM-04.3).
    if (t.is_locked) return fail(403, { message: 'Este hilo está bloqueado' });
    if (!flags.can_post) return fail(403, { message: 'No puedes responder en esta sección' });

    const form = await request.formData();
    const content = String(form.get('content') ?? '');
    if (!content.trim()) return fail(400, { message: 'El mensaje no puede estar vacío' });

    const imgCheck = validateForumImageUrls(content);
    if (!imgCheck.valid) return fail(400, { message: `Imagen no permitida: ${imgCheck.rejected.join(', ')}` });

    // next post_number = max + 1 (posts ordered ascending)
    const { data: existingPosts } = await supabase.from('posts').select('post_number').eq('thread_id', t.id);
    const posts = (existingPosts ?? []) as unknown as { post_number: number }[];
    const nextNumber = posts.length === 0 ? 1 : Math.max(...posts.map((p) => p.post_number)) + 1;

    const { error: insertError } = await supabase.from('posts').insert({
      thread_id: t.id,
      author_id: user!.id,
      body: content,
      post_number: nextNumber,
    });

    if (insertError) return fail(400, { message: insertError.message });
    throw redirect(303, `/foro/${t.id}`);
  },

  delete: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const postId = String(form.get('post_id') ?? '');

    const { data: post } = await supabase.from('posts').select('*').eq('id', postId).single();
    if (!post) return fail(404, { message: 'Mensaje no encontrado' });

    const p = post as unknown as { author_id: string };
    const isOwner = user!.id === p.author_id;
    const isStaff = profile?.role === 'gm' || profile?.role === 'admin';
    if (!isOwner && !isStaff) return fail(403, { message: 'No puedes eliminar un mensaje que no es tuyo' });

    // Delete the row without renumbering post_number (REQ-FORUM-03.4).
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId);
    if (deleteError) return fail(400, { message: deleteError.message });

    const { error: auditError } = await supabase.rpc('log_audit', {
      p_action: 'eliminar_post',
      p_entity_type: 'post',
      p_entity_id: postId,
      p_details: { thread_id: params.threadId },
    });
    if (auditError) console.error('log_audit falló para eliminar_post', postId, auditError);

    throw redirect(303, `/foro/${params.threadId}`);
  },

  // Like ("Gracias") toggle — idempotent (REQ-REACT-01.3). First click inserts the
  // row; re-click deletes it. RLS enforces own-row insert/delete. UNIQUE race on
  // (post_id, user_id) is a silent no-op: 23505 is NOT surfaced as an error toast
  // (design decision B). No log_audit for likes (decision F).
  like: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const postId = String(form.get('post_id') ?? '');

    const { data: existing } = await supabase
      .from('reactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user!.id)
      .maybeSingle();

    if (existing) {
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user!.id);
      if (deleteError) return fail(400, { message: deleteError.message });
    } else {
      const { error: insertError } = await supabase
        .from('reactions')
        .insert({ post_id: postId, user_id: user!.id });
      // 23505 = concurrent like already inserted -> idempotent, silent success
      if (insertError && insertError.code !== '23505') {
        return fail(400, { message: insertError.message });
      }
    }

    throw redirect(303, `/foro/${params.threadId}`);
  },
};
