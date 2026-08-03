import { redirect } from '@sveltejs/kit';
import { resolveEffectivePermissions, forumAccessAllowed, type PermissionFlags } from '$lib/auth';
import type { CategoryNode, ThreadListItem } from '$lib/forum';
import type { UserRole } from '$lib/types';
import type { PageServerLoad } from './$types';

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  is_visible: boolean;
  sort_order: number;
};

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
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

  const cats = (categories ?? []) as unknown as CategoryRow[];
  // Guests (pendiente) see only is_visible categories; admin sees all.
  const visibleCats = cats.filter((c) => isAdminUser || c.is_visible);

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

  const withFlags = (c: CategoryRow): CategoryNode => {
    const flags =
      (permByCat.get(c.id) as PermissionFlags | undefined) ??
      resolveEffectivePermissions({ section: null, thread: null, role });
    const own = threadList.filter((t) => t.category_id === c.id);
    const children = cats
      .filter((k) => k.parent_id === c.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(withFlags);
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      is_visible: c.is_visible,
      flags: { ...flags, can_view: isStaff || c.is_visible ? flags.can_view : true },
      children,
      threads: children.length ? [] : own,
    };
  };

  const roots = visibleCats.filter((c) => c.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);

  return {
    categories: roots.map(withFlags),
    roleLabel: role,
    isAdmin: isAdminUser,
    isStaff,
  };
};
