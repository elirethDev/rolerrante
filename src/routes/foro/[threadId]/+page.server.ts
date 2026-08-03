import { error } from '@sveltejs/kit';
import { resolveEffectivePermissions, type PermissionFlags } from '$lib/auth';
import { getOrCreateThread, type ThreadView, type PostView } from '$lib/forum';
import type { Json } from '$lib/supabase/database.types';
import type { UserRole } from '$lib/types';
import type { PageServerLoad } from './$types';

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
    .select('*, author:author_id(id, display_name, username)')
    .eq('thread_id', t.id)
    .order('post_number', { ascending: true });

  return {
    thread: t,
    threadBody,
    posts: (posts ?? []) as unknown as PostView[],
    entity,
    flags,
    isLocked: t.is_locked,
    isOwner,
    isStaff,
  };
};
