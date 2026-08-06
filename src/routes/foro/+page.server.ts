import { fail, redirect } from '@sveltejs/kit';
import {
  resolveEffectivePermissions,
  forumAccessAllowed,
  requireAuth,
  validateForumImageUrls,
  validateForumHrefs,
  type PermissionFlags,
} from '$lib/auth';
import { searchThreads, minReadRoleSatisfied, enrichThreadsWithPosts, type CategoryNode, type PostActivityRow, type ThreadListItem } from '$lib/forum';
import type { UserRole } from '$lib/types';
import type { Database } from '$lib/supabase/database.types';
import type { Actions, PageServerLoad } from './$types';

// Categories now use the generated Supabase Row type (RED-05) — no hand-rolled
// duplicate of the schema.
type CategoryRow = Database['public']['Tables']['categories']['Row'];

export const load: PageServerLoad = async ({ locals: { supabase, profile }, url }) => {
  // Suspended/banned users are denied forum access (REQ-MOD-ENF-03.2).
  if (profile && !(await forumAccessAllowed(supabase, profile))) {
    throw redirect(303, '/');
  }

  const role: UserRole = profile?.role ?? 'pendiente';
  const isAdminUser = role === 'admin';
  const isStaff = role === 'gm' || role === 'admin';

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const { data: perms } = await supabase
    .from('section_permissions')
    .select('*')
    .eq('role', role);

  const permByCat = new Map<string, PermissionFlags>();
  for (const p of perms ?? []) {
    permByCat.set(p.category_id, {
      can_view: p.can_view,
      can_post: p.can_post,
      can_edit: p.can_edit,
      can_lock: p.can_lock,
    });
  }

  const cats = categories ?? [];
  // Guests (pendiente) see only is_visible categories; admin sees all. A
  // category's "rol mínimo de lectura" (min_read_role) further narrows who may
  // read it (FORO-CAT-MINROLE): NULL = Público (todo el mundo).
  const visibleCats = cats.filter(
    (c) => isAdminUser || (c.is_visible && minReadRoleSatisfied(role, c.min_read_role)),
  );

  const q = url.searchParams.get('q')?.trim() ?? '';

  // Search branch: render flat thread results instead of the category tree.
  if (q) {
    const visibleCategoryIds = visibleCats.map((c) => c.id);
    const searchResults = await searchThreads(q, supabase, {
      isAdminUser,
      visibleCategoryIds,
    });
    return {
      isSearch: true,
      query: q,
      searchResults,
      categories: [],
      roleLabel: role,
      isAdmin: isAdminUser,
      isStaff,
    };
  }

  // Public thread visibility: debates (abierto) and approved bridged threads (aprobado).
  // Staff additionally see pending threads they own.
  const visibleIds = visibleCats.map((c) => c.id);

  const { data: threads } = await supabase
    .from('threads')
    .select('*')
    .in('category_id', visibleIds)
    .in('status', ['abierto', 'aprobado'])
    .order('created_at', { ascending: false });

  const threadList = (threads ?? []) as unknown as ThreadListItem[];

  // Category counts + last-post (REQ-FORUM-02.1/02.2): fetch posts for the
  // visible threads (already status/category filtered above), group by thread,
  // and derive per-category totals and the most recent visible post metadata.
  const threadIds = threadList.map((t) => t.id);
  let posts: PostActivityRow[] = [];
  if (threadIds.length > 0) {
    const { data } = await supabase
      .from('posts')
      .select('id, thread_id, created_at, author:author_id(id, display_name, username, avatar_url)')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false });
    posts = (data ?? []) as PostActivityRow[];
  }

  const enriched = enrichThreadsWithPosts(threadList, posts);

  const withFlags = (c: CategoryRow): CategoryNode => {
    const flags =
      (permByCat.get(c.id) as PermissionFlags | undefined) ??
      resolveEffectivePermissions({ section: null, thread: null, role });
    const own = enriched.filter((t) => t.category_id === c.id);
    const children = cats
      .filter((k) => k.parent_id === c.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(withFlags);
    // The category's newest activity is its own latest post across its threads.
    const newestThread = own
      .filter((t) => t.lastPost?.created_at)
      .sort((a, b) =>
        String(b.lastPost?.created_at ?? '').localeCompare(String(a.lastPost?.created_at ?? '')),
      )[0];
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      is_visible: c.is_visible,
      min_read_role: c.min_read_role,
      requires_approval: c.requires_approval,
      flags: { ...flags, can_view: (isStaff || c.is_visible) ? flags.can_view : false },
      children,
      threads: children.length ? [] : own,
      threads_count: own.length,
      posts_count: own.reduce((n, t) => n + t.posts_count, 0),
      lastPost: newestThread?.lastPost ?? null,
    };
  };

  const roots = visibleCats.filter((c) => c.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);

  return {
    isSearch: false,
    query: '',
    searchResults: [],
    categories: roots.map(withFlags),
    roleLabel: role,
    isAdmin: isAdminUser,
    isStaff,
  };
};

export const actions: Actions = {
  // Quick new-thread from the /foro modal (OD alignment). Mirrors
  // foro/nuevo's default action but adds two flags: is_sticky (staff only) and
  // allow_replies (unchecked ⇒ create locked).
  quickCreate: async ({ request, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    // Suspended/banned users are denied forum access (REQ-MOD-ENF-03.2).
    if (profile && !(await forumAccessAllowed(supabase, profile))) {
      throw redirect(303, '/');
    }

    const role: UserRole = profile?.role ?? 'pendiente';
    const isStaff = role === 'gm' || role === 'admin';

    const form = await request.formData();
    const title = String(form.get('title') ?? '').trim();
    const content = String(form.get('content') ?? '').trim();
    const categoryId = String(form.get('category_id') ?? '');
    // Only staff may pin; a smuggled is_sticky flag from a non-staff client is
    // silently forced to false (the UI hides the checkbox for non-staff).
    const isSticky = isStaff && form.get('is_sticky') === 'on';
    // allow_replies is a checkbox: present ⇒ open thread; absent ⇒ locked.
    const allowReplies = form.get('allow_replies') === 'on';

    if (!title || !content || !categoryId) {
      return fail(400, { message: 'Título, contenido y sección son obligatorios' });
    }

    const imgCheck = validateForumImageUrls(content);
    if (!imgCheck.valid) {
      return fail(400, { message: `Imagen no permitida: ${imgCheck.rejected.join(', ')}` });
    }

    const hrefCheck = validateForumHrefs(content);
    if (!hrefCheck.valid) {
      return fail(400, { message: `Enlace no permitido: ${hrefCheck.rejected.join(', ')}` });
    }

    const { data: category } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('id', categoryId)
      .single();
    if (!category) return fail(403, { message: 'Sección inválida' });

    // Role must be allowed to post in the chosen section (same flag the load
    // derives per category). Staff can always create.
    if (!isStaff) {
      const { data: sectionRows } = await supabase
        .from('section_permissions')
        .select('*')
        .eq('role', role);
      const sectionRow = (sectionRows ?? []).find(
        (p) => (p as { category_id: string }).category_id === categoryId,
      ) as PermissionFlags | undefined;
      const flags = resolveEffectivePermissions({ section: sectionRow ?? null, thread: null, role });
      if (!flags.can_post) return fail(403, { message: 'No tienes permiso para crear debates en esta sección' });
    }

    const { data: thread, error } = await supabase
      .from('threads')
      .insert({
        category_id: categoryId,
        content_type: 'debate',
        title,
        body: content,
        author_id: user!.id,
        status: 'abierto',
        is_locked: !allowReplies,
        is_sticky: isSticky,
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

    if (isSticky) {
      const { error: pinAuditError } = await supabase.rpc('log_audit', {
        p_action: 'fijar_hilo',
        p_entity_type: 'thread',
        p_entity_id: thread.id,
        p_details: { thread_id: thread.id },
      });
      if (pinAuditError) console.error('log_audit falló para fijar_hilo', thread.id, pinAuditError);
    }

    throw redirect(303, `/foro/${thread.id}`);
  },
};
