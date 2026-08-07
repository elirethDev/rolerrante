import { error, redirect } from '@sveltejs/kit';
import { resolveEffectivePermissions, forumAccessAllowed, type PermissionFlags } from '$lib/auth';
import { enrichThreadsWithPosts, minReadRoleSatisfied, type PostActivityRow, type ThreadListItem, type ThreadStatus } from '$lib/forum';
import type { UserRole } from '$lib/types';
import type { Database } from '$lib/supabase/database.types';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;
const VISIBLE_STATUSES: ThreadStatus[] = ['abierto', 'aprobado'];

type CategoryRow = Database['public']['Tables']['categories']['Row'];

export const load: PageServerLoad = async ({ locals: { supabase, profile }, url, params }) => {
  // Suspended/banned users are denied forum access (REQ-MOD-ENF-03.2).
  if (profile && !(await forumAccessAllowed(supabase, profile))) {
    throw redirect(303, '/');
  }

  const role: UserRole = profile?.role ?? 'pendiente';
  const isAdminUser = role === 'admin';
  const isStaff = role === 'gm' || role === 'admin';

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', params.categoryId)
    .single();
  if (!category) throw error(404, 'Sección no encontrada');
  // Hidden sections stay hidden to non-staff, mirroring the /foro visibleCats filter.
  if (!isAdminUser && !category.is_visible) throw error(404, 'Sección no encontrada');
  // min_read_role gate (FORO-CAT-MINROLE): a role below the minimum is denied.
  // Admins always satisfy it (rank check).
  if (!minReadRoleSatisfied(role, category.min_read_role)) {
    throw error(403, 'No tienes permiso para ver esta sección');
  }

  // Independent reads fire together (PERF-04): perms + all categories for the
  // sub-navigation and the pagination count only depend on the resolved section.
  const [permsRes, catsRes] = await Promise.all([
    supabase.from('section_permissions').select('*').eq('role', role),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
  ]);

  const permByCat = new Map<string, PermissionFlags>();
  for (const p of permsRes.data ?? []) {
    permByCat.set(p.category_id, {
      can_view: p.can_view,
      can_post: p.can_post,
      can_edit: p.can_edit,
      can_lock: p.can_lock,
    });
  }

  const flags =
    (permByCat.get(category.id) as PermissionFlags | undefined) ??
    resolveEffectivePermissions({ section: null, thread: null, role });

  // Sub-navigation: child sections the viewer may read, ordered like the index.
  const visibleCats = (catsRes.data ?? []).filter(
    (c: CategoryRow) => isAdminUser || (c.is_visible && minReadRoleSatisfied(role, c.min_read_role)),
  );
  const children = visibleCats
    .filter((k: CategoryRow) => k.parent_id === category.id)
    .sort((a: CategoryRow, b: CategoryRow) => a.sort_order - b.sort_order)
    .map((k: CategoryRow) => ({ id: k.id, name: k.name, description: k.description }));

  // Breadcrumb trail (Sección → … → Categoría): resolve the ancestor chain by
  // walking parent_id up to the root so deep categories show their full path.
  const allCats = catsRes.data ?? [];
  const catById = new Map<string, CategoryRow>(allCats.map((c: CategoryRow) => [c.id, c]));
  const trail: { id: string; name: string }[] = [];
  let cursor: CategoryRow | undefined = category as CategoryRow;
  while (cursor) {
    trail.unshift({ id: cursor.id, name: cursor.name });
    cursor = cursor.parent_id ? catById.get(cursor.parent_id) : undefined;
  }

  // Determine the descendant leaf category ids (category → its sub-categories
  // → … → hoja). Threads of this category AND of any descendant leaf are shown
  // together, so deep categories group all their nested threads (sorted by date).
  const descendants = new Set<string>();
  const collect = (parentId: string) => {
    for (const c of allCats as CategoryRow[]) {
      if (c.parent_id === parentId && !descendants.has(c.id)) {
        descendants.add(c.id);
        collect(c.id);
      }
    }
  };
  collect(category.id);
  const threadCategoryIds = [category.id, ...descendants];

  // Thread count for pagination (REQ-FORUM-02.3), then the current page of threads.
  const { count } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true })
    .in('category_id', threadCategoryIds)
    .in('status', VISIBLE_STATUSES);
  const totalThreads = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalThreads / PAGE_SIZE));

  const requestedPage = Number(url.searchParams.get('page') ?? 1);
  // Page ≤ 0 or > max clamps to 1 (REQ-FORUM-02.3, same as the thread page).
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= totalPages
      ? requestedPage
      : 1;

  // Sticky threads float to the top (is_sticky DESC), then by last activity.
  const { data: threads } = await supabase
    .from('threads')
    .select('*, author:author_id(id, display_name, username)')
    .in('category_id', threadCategoryIds)
    .in('status', VISIBLE_STATUSES)
    .order('is_sticky', { ascending: false })
    .order('updated_at', { ascending: false })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  const pageThreads = (threads ?? []) as unknown as ThreadListItem[];

  // Reply counts + last-post metadata for the current page (REQ-FORUM-02.2).
  const pageThreadIds = pageThreads.map((t) => t.id);
  let posts: PostActivityRow[] = [];
  if (pageThreadIds.length > 0) {
    const { data } = await supabase
      .from('posts')
      .select('id, thread_id, created_at, author:author_id(id, display_name, username, avatar_url)')
      .in('thread_id', pageThreadIds)
      .order('created_at', { ascending: false });
    posts = (data ?? []) as PostActivityRow[];
  }

  return {
    trail,
    category: {
      id: category.id,
      name: category.name,
      description: category.description,
      requires_approval: category.requires_approval,
      parent_id: category.parent_id,
    },
    children,
    threads: enrichThreadsWithPosts(pageThreads, posts),
    totalThreads,
    totalPages,
    currentPage,
    flags,
    roleLabel: role,
    isAdmin: isAdminUser,
    isStaff,
  };
};