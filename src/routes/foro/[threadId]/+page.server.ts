import { error, fail, redirect } from '@sveltejs/kit';
import { resolveEffectivePermissions, validateForumImageUrls, validateForumHrefs, requireAuth, isGMOrAdmin, forumAccessAllowed, type PermissionFlags } from '$lib/auth';
import { applyQuoteToBody, EXCERPT_MAX_LENGTH } from '$lib/forum-compose';
import { getOrCreateThread, getThreadFollow, followThread, unfollowThread, setFollowPreference, reportPost, type ThreadView, type PostView } from '$lib/forum';
import type { Json } from '$lib/supabase/database.types';
import type { UserRole, Profile } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;

type SectionPermRow = { category_id: string; role: UserRole; can_view: boolean; can_post: boolean; can_edit: boolean; can_lock: boolean };
type ThreadPermRow = { thread_id: string; role: UserRole; can_view: boolean; can_post: boolean; can_edit: boolean; can_lock: boolean };

function toFlags(p: { can_view: boolean; can_post: boolean; can_edit: boolean; can_lock: boolean }): PermissionFlags {
  return { can_view: p.can_view, can_post: p.can_post, can_edit: p.can_edit, can_lock: p.can_lock };
}

// Suspended/banned users are denied forum access (REQ-MOD-ENF-03.2).
async function gateForumAccess(
  supabase: Parameters<typeof forumAccessAllowed>[0],
  profile: Profile | null,
) {
  if (profile && !(await forumAccessAllowed(supabase, profile))) {
    throw redirect(303, '/');
  }
}

export const load: PageServerLoad = async ({ url, params, locals: { supabase, user, profile } }) => {
  await gateForumAccess(supabase, profile);
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
  // The entity row read (name/status) is deferred into the parallel batch below.
  let entity: { name: string; status: string } | null = null;
  let entityCol: string | null = null;
  let entityQuery: Promise<{ data: unknown; error: unknown }> | null = null;
  if (t.linked_entity_type && t.linked_entity_id) {
    const eType = t.linked_entity_type as 'story' | 'character' | 'event';
    await getOrCreateThread(eType, t.linked_entity_id, t.author_id, supabase);
    const table = eType === 'story' ? 'stories' : eType === 'character' ? 'characters' : 'events';
    entityCol = eType === 'character' ? 'name' : 'title';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entityQuery = supabase.from(table).select(`${entityCol}, status`).eq('id', t.linked_entity_id).single() as any;
  }

  // Independent reads fire together (PERF-04): permissions, pagination count,
  // bridged entity row and follow state only depend on the thread already
  // fetched, collapsing ~4 sequential round trips into one.
  const [sectionRes, threadRes, countRes, entityRes, follow] = await Promise.all([
    supabase.from('section_permissions').select('*').eq('category_id', t.category_id ?? ''),
    supabase.from('thread_permissions').select('*').eq('thread_id', t.id),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('thread_id', t.id),
    entityQuery ?? Promise.resolve({ data: null, error: null }),
    user ? getThreadFollow(t.id, user.id, supabase) : Promise.resolve({ following: false, notify_in_app: true }),
  ]);

  const { data: sectionRows } = sectionRes;
  const { data: threadRows } = threadRes;
  const { count } = countRes;
  const entityRow = (entityRes as { data: unknown } | null)?.data;
  if (entityRow && entityCol) {
    const row = entityRow as Record<string, unknown>;
    entity = {
      name: String(row[entityCol] ?? ''),
      status: String(row.status ?? ''),
    };
  }

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

  // Paginated posts (REQ-FORUM-02.3): ?page= defaults to 1, LIMIT 20, OFFSET (page-1)*20.
  const totalPosts = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));

  const requestedPage = Number(url.searchParams.get('page') ?? 1);
  // Page ≤ 0 or > max clamps to 1 (REQ-FORUM-02.3).
  const currentPage = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= totalPages ? requestedPage : 1;

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*, author:author_id(id, display_name, username), reactions:reactions(post_id, user_id)')
    .eq('thread_id', t.id)
    .order('post_number', { ascending: true })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  // Reaction aggregate + viewer's own like via left-join (REQ-REACT-01.2).
  // Guests still see the count but have no like state (viewer_has_liked null).
  let postsWithReactions: unknown[];
  if (postsError || !posts) {
    // Graceful degradation (FIX-3): if the reactions join fails (e.g. the
    // reactions table/migration isn't deployed yet), PostgREST returns null and
    // the thread would otherwise render EMPTY. Re-query base posts (no reactions
    // embed) and render every post with a neutral reaction state rather than an
    // empty thread.
    console.error('No se pudieron cargar las reacciones; se muestran los posts base', postsError);
    const { data: basePosts } = await supabase
      .from('posts')
      .select('*, author:author_id(id, display_name, username)')
      .eq('thread_id', t.id)
      .order('post_number', { ascending: true });
    postsWithReactions = (basePosts ?? []).map((p) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(p as any),
      like_count: 0,
      viewer_has_liked: null,
    }));
  } else {
    const viewerId = user?.id ?? null;
    postsWithReactions = posts.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reactions = (p as any).reactions ?? [];
      return {
        ...p,
        like_count: reactions.length,
        viewer_has_liked: viewerId ? reactions.some((r: { user_id: string }) => r.user_id === viewerId) : null,
      };
    });
  }

  return {
    thread: t,
    threadBody,
    posts: postsWithReactions as unknown as PostView[],
    totalPosts,
    totalPages,
    currentPage,
    entity,
    flags,
    isLocked: t.is_locked,
    isSticky: t.is_sticky,
    isOwner,
    isStaff,
    follow,
    isAuthenticated: !!user,
  };
};

export const actions: Actions = {
  reply: async ({ request, params, locals: { supabase, user, profile } }) => {    requireAuth({ user, profile });
    await gateForumAccess(supabase, profile);
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

    // Optional quote payload (REQ-FC-04 / REQ-FORUM-03.2). The composer sends
    // quote_author, quote_excerpt (≤500) and quote_post_id. Validate all three
    // and, on success, prepend an authoritative blockquote to the body.
    let body = content;
    const quoteAuthor = String(form.get('quote_author') ?? '').trim();
    const quoteExcerpt = String(form.get('quote_excerpt') ?? '');
    const quotePostId = String(form.get('quote_post_id') ?? '');

    if (quotePostId) {
      if (!quoteAuthor) return fail(400, { message: 'El autor de la cita es obligatorio' });
      if (quoteExcerpt.length > EXCERPT_MAX_LENGTH) {
        return fail(400, { message: `La cita excede los ${EXCERPT_MAX_LENGTH} caracteres` });
      }
      // The quoted post must live in this thread.
      const { data: quotedRows } = await supabase
        .from('posts')
        .select('id')
        .eq('id', quotePostId)
        .eq('thread_id', t.id)
        .maybeSingle();
      if (!quotedRows) return fail(400, { message: 'El mensaje citado no pertenece a este hilo' });
      body = applyQuoteToBody(content, {
        author_display_name: quoteAuthor,
        body_excerpt: quoteExcerpt,
        post_id: quotePostId,
      });
    }

    const imgCheck = validateForumImageUrls(body);
    if (!imgCheck.valid) return fail(400, { message: `Imagen no permitida: ${imgCheck.rejected.join(', ')}` });

    const hrefCheck = validateForumHrefs(body);
    if (!hrefCheck.valid) return fail(400, { message: `Enlace no permitido: ${hrefCheck.rejected.join(', ')}` });

    // next post_number = last + 1: fetch only the newest row (ORDER DESC LIMIT 1)
    // instead of every post_number in the thread (PERF-03).
    const { data: lastPost } = await supabase
      .from('posts')
      .select('post_number')
      .eq('thread_id', t.id)
      .order('post_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = ((lastPost as { post_number?: number } | null)?.post_number ?? 0) + 1;

    const { error: insertError } = await supabase.from('posts').insert({
      thread_id: t.id,
      author_id: user!.id,
      body,
      post_number: nextNumber,
    });

    if (insertError) return fail(400, { message: insertError.message });
    throw redirect(303, `/foro/${t.id}`);
  },

  delete: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    await gateForumAccess(supabase, profile);
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

    // Validate the target post BEFORE any write: it must exist, belong to the
    // requested thread, and sit in a thread the viewer may see. This mirrors the
    // reply action's thread revalidation and stops a client from smuggling a
    // post_id from another/hidden thread to inflate or tamper with its count
    // (FIX-2, REACT-01.1).
    const { data: post } = await supabase
      .from('posts')
      .select('id, thread_id, thread:thread_id(status, author_id)')
      .eq('id', postId)
      .eq('thread_id', params.threadId)
      .maybeSingle();

    if (!post) return fail(400, { message: 'No puedes reaccionar a este mensaje' });
    const p = post as unknown as { thread_id: string; thread: { status: string; author_id: string } | null };
    const tgtThread = p.thread;
    const isOwner = !!user && tgtThread?.author_id === user.id;
    const isStaff = profile?.role === 'gm' || profile?.role === 'admin';
    const publiclyVisible = tgtThread?.status === 'abierto' || tgtThread?.status === 'aprobado';
    if (!publiclyVisible && !isOwner && !isStaff) {
      return fail(400, { message: 'No puedes reaccionar a este mensaje' });
    }

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

  // Pin/unpin (REQ-FORUM-04.3): GM/admin only, author can never pin their own thread.
  // Mirrors the lock gate; is_sticky toggled + audit fijar_hilo/desfijar_hilo.
  pin: async ({ params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    if (!profile?.role || !isGMOrAdmin(profile.role)) return fail(403, { message: 'Acceso denegado' });
    const threadId = params.threadId;

    const { data: thread } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .single();
    if (!thread) throw error(404, 'Hilo no encontrado');
    if ((thread as unknown as { author_id?: string }).author_id === user?.id) {
      return fail(403, { message: 'El autor no puede fijar su propio hilo' });
    }

    const { error: dbError } = await supabase.from('threads').update({ is_sticky: true }).eq('id', threadId);
    if (dbError) return fail(400, { message: dbError.message });

    await supabase.rpc('log_audit', {
      p_action: 'fijar_hilo',
      p_entity_type: 'thread',
      p_entity_id: threadId,
      p_details: { thread_id: threadId },
    });
    return { success: true };
  },

  unpin: async ({ params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    if (!profile?.role || !isGMOrAdmin(profile.role)) return fail(403, { message: 'Acceso denegado' });
    const threadId = params.threadId;

    const { data: thread } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .single();
    if (!thread) throw error(404, 'Hilo no encontrado');
    if ((thread as unknown as { author_id?: string }).author_id === user?.id) {
      return fail(403, { message: 'El autor no puede desfijar su propio hilo' });
    }

    const { error: dbError } = await supabase.from('threads').update({ is_sticky: false }).eq('id', threadId);
    if (dbError) return fail(400, { message: dbError.message });

    await supabase.rpc('log_audit', {
      p_action: 'desfijar_hilo',
      p_entity_type: 'thread',
      p_entity_id: threadId,
      p_details: { thread_id: threadId },
    });
    return { success: true };
  },

  // Slice 2 — follow/unfollow + in-app preference (REQ-FOLLOW-01/02).
  follow: async ({ params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    try {
      await followThread(params.threadId, user!.id, supabase);
    } catch (e) {
      // A second Seguir on an existing follow hits the UNIQUE(thread_id,user_id)
      // constraint — treat it as idempotent success (REQ-FOLLOW-01 duplicate).
      if ((e as { code?: string }).code !== '23505') throw e;
    }
    return { ok: true, following: true };
  },

  unfollow: async ({ params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    await unfollowThread(params.threadId, user!.id, supabase);
    return { ok: true, following: false };
  },

  preference: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const notify = form.get('notify_in_app') === 'on';
    await setFollowPreference(params.threadId, user!.id, notify, supabase);
    return { ok: true, notify_in_app: notify };
  },

  report: async ({ request, params, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    await gateForumAccess(supabase, profile);

    const form = await request.formData();
    const postId = String(form.get('post_id') ?? '');
    const reason = String(form.get('reason') ?? '').trim();

    if (!postId) return fail(400, { message: 'Mensaje obligatorio' });
    if (!reason) return fail(400, { message: 'El motivo del reporte es obligatorio' });
    if (reason.length > 500) return fail(400, { message: 'El motivo no puede superar 500 caracteres' });

    // Dedupe/rate-limit: a reporter cannot open the same post report twice
    // (REP-01 same-user same-post scenario). RLS lets the reporter read their
    // own rows (reporter self-SELECT policy), so this check works in-app.
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('post_id', postId)
      .eq('reporter_id', user!.id)
      .eq('status', 'abierta')
      .maybeSingle();
    if (existing) {
      return fail(400, { message: 'Ya reportaste este mensaje' });
    }

    const result = await reportPost(supabase, postId, reason);
    if (result.error) return fail(400, { message: result.error });

    throw redirect(303, `/foro/${params.threadId}`);
  },
};
