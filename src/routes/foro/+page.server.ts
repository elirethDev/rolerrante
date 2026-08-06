import { redirect } from '@sveltejs/kit';
import { resolveEffectivePermissions, forumAccessAllowed, type PermissionFlags } from '$lib/auth';
import { searchThreads, minReadRoleSatisfied, type CategoryNode, type LastPostInfo, type ThreadListItem } from '$lib/forum';
import type { UserRole } from '$lib/types';
import type { Database } from '$lib/supabase/database.types';
import type { PageServerLoad } from './$types';

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
  type PostWithAuthor = {
    id: string;
    thread_id: string;
    created_at: string;
    author: { id: string; display_name: string | null; username?: string; avatar_url?: string | null } | null;
  };
  const postsByThread = new Map<string, PostWithAuthor[]>();
  const threadIds = threadList.map((t) => t.id);
  if (threadIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, thread_id, created_at, author:author_id(id, display_name, username, avatar_url)')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false });
    for (const p of (posts ?? []) as PostWithAuthor[]) {
      const arr = postsByThread.get(p.thread_id) ?? [];
      arr.push(p);
      postsByThread.set(p.thread_id, arr);
    }
  }

  const toLastPost = (p: PostWithAuthor | undefined): LastPostInfo | null =>
    p
      ? {
          avatar_url: p.author?.avatar_url ?? null,
          author_display_name: p.author?.display_name ?? p.author?.username ?? null,
        }
      : null;

  // Posts arrive grouped per thread (created_at desc); pick the newest defensively.
  const newestOf = (posts: PostWithAuthor[]) =>
    [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const enrichThread = (t: ThreadListItem): ThreadListItem => {
    const ps = postsByThread.get(t.id) ?? [];
    return { ...t, posts_count: ps.length, lastPost: toLastPost(newestOf(ps)) };
  };

  const withFlags = (c: CategoryRow): CategoryNode => {
    const flags =
      (permByCat.get(c.id) as PermissionFlags | undefined) ??
      resolveEffectivePermissions({ section: null, thread: null, role });
    const own = threadList.filter((t) => t.category_id === c.id).map(enrichThread);
    const ownPosts = own.flatMap((t) => postsByThread.get(t.id) ?? []);
    const children = cats
      .filter((k) => k.parent_id === c.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(withFlags);
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
      posts_count: ownPosts.length,
      lastPost: toLastPost(newestOf(ownPosts)),
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
