import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './supabase/database.types';
import type { PermissionFlags } from './auth';

export type ThreadEntityType = 'story' | 'character' | 'event';
export type ThreadRow = Database['public']['Tables']['threads']['Row'];
export type ThreadStatus = Database['public']['Enums']['thread_status'];
export interface LastPostInfo {
  avatar_url?: string | null;
  author_display_name?: string | null;
}

export interface ThreadListItem {
  id: string;
  title: string;
  content_type: string;
  status: string;
  is_locked: boolean;
  is_sticky: boolean;
  created_at: string;
  edited_at: string | null;
  category_id: string | null;
  posts_count: number;
  lastPost?: LastPostInfo | null;
}

export interface CategoryNode {
  id: string;
  name: string;
  description: string | null;
  is_visible: boolean;
  children: CategoryNode[];
  flags: PermissionFlags;
  threads: ThreadListItem[];
  threads_count: number;
  posts_count: number;
  lastPost?: LastPostInfo | null;
}

export interface AuthorRef {
  id: string;
  display_name?: string | null;
  username?: string;
}

/**
 * Payload emitted by PostCard's Citar action and consumed by ReplyComposer to
 * prefill a blockquote reply (REQ-FC-04 / REQ-FORUM-02.5).
 */
export interface QuotePayload {
  author_display_name: string;
  body_excerpt: string; // first 500 chars, plain-text stripped
  post_id: string;
}

export interface ThreadView {
  id: string;
  title: string;
  status: string;
  content_type: string;
  body: Json;
  author_id: string;
  created_at: string;
  edited_at: string | null;
  edited_by: string | null;
  is_locked: boolean;
  is_sticky: boolean;
  category_id: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  author?: AuthorRef | null;
}

export interface PostView {
  id: string;
  post_number: number;
  body: Json;
  author_id: string;
  created_at: string;
  edited_at: string | null;
  edited_by: string | null;
  author?: AuthorRef | null;
  // Reactions (REQ-REACT-01.2): like_count aggregate + viewer's own like state.
  // viewer_has_liked is null for guests (no identity to match); like_count is
  // always populated for both guests and authenticated viewers.
  like_count: number | null;
  viewer_has_liked: boolean | null;
}

export interface SearchThreadOptions {
  /** Admin sees every matching thread regardless of category visibility. */
  isAdminUser: boolean;
  /** Category ids visible to the current role; used to hide guests from hidden sections. */
  visibleCategoryIds: string[];
}

const VISIBLE_THREAD_STATUSES: ThreadStatus[] = ['abierto', 'aprobado'];

/**
 * Search threads by ILIKE on title and on the display name of a linked character
 * (REQ-SEARCH-01). Runs two parallel ILIKE queries — title match and character
 * name match via `linked_entity` — then unions and dedups client-side. Guests
 * never see pending/hidden threads or threads in invisible categories.
 */
export async function searchThreads(
  q: string,
  supabase: SupabaseClient<Database>,
  opts: SearchThreadOptions,
): Promise<ThreadListItem[]> {
  const pattern = `%${q}%`;

  const [titleRes, charRes] = await Promise.all([
    supabase
      .from('threads')
      .select('*')
      .ilike('title', pattern)
      .in('status', VISIBLE_THREAD_STATUSES),
    supabase.from('characters').select('id').ilike('name', pattern),
  ]);

  const titleThreads = (titleRes.data ?? []) as unknown as ThreadListItem[];

  const charIds = (charRes.data ?? []).map((c) => c.id);
  let charThreads: ThreadListItem[] = [];
  if (charIds.length > 0) {
    const { data } = await supabase
      .from('threads')
      .select('*')
      .in('linked_entity_id', charIds)
      .eq('linked_entity_type', 'character')
      .in('status', VISIBLE_THREAD_STATUSES);
    charThreads = (data ?? []) as unknown as ThreadListItem[];
  }

  // Client-side union + dedup by thread id.
  const byId = new Map<string, ThreadListItem>();
  for (const t of [...titleThreads, ...charThreads]) {
    if ((VISIBLE_THREAD_STATUSES as string[]).includes(t.status) && !byId.has(t.id)) {
      byId.set(t.id, t);
    }
  }
  const merged = [...byId.values()];

  // Guests must not see threads inside invisible categories; admin bypasses.
  const final: ThreadListItem[] = opts.isAdminUser
    ? merged
    : merged.filter((t) => !t.category_id || opts.visibleCategoryIds.includes(t.category_id));

  if (final.length === 0) return final;

  // Reply counts for the flat search list (REQ-FORUM-02.2).
  const { data: posts } = await supabase
    .from('posts')
    .select('thread_id')
    .in('thread_id', final.map((t) => t.id));
  const count = new Map<string, number>();
  for (const p of (posts ?? []) as { thread_id: string }[]) {
    count.set(p.thread_id, (count.get(p.thread_id) ?? 0) + 1);
  }
  return final.map((t) => ({ ...t, posts_count: count.get(t.id) ?? 0 }));
}

export interface NotificationView {
  id: string;
  type: string;
  thread_id: string;
  post_id: string;
  actor_id: string;
  read_at: string | null;
  created_at: string;
  actor?: AuthorRef | null;
  thread?: { id: string; title: string } | null;
}

const CONTENT_TYPES: Record<ThreadEntityType, ThreadRow['content_type']> = {
  story: 'historia',
  character: 'ficha',
  event: 'evento',
};

/**
 * Map an underlying entity's status to the bridged thread status (REQ-FORUM-05.2).
 * - story/character (approval_status): 'aprobado' -> 'aprobado' (public), else 'pendiente'.
 * - event (event_status): only a cancelled event stays private; everything else is
 *   visible ('abierto') without requiring review (REQ-FORUM-05.3).
 */
export function mapEntityStatusToThreadStatus(
  entityType: ThreadEntityType,
  entityStatus: string,
): ThreadStatus {
  if (entityType === 'event') {
    return entityStatus === 'cancelado' ? 'pendiente' : 'abierto';
  }
  return entityStatus === 'aprobado' ? 'aprobado' : 'pendiente';
}

interface EntitySeed {
  title: string;
  status: string;
  body: Json;
}

async function fetchEntity(
  entityType: ThreadEntityType,
  entityId: string,
  supabase: SupabaseClient<Database>,
): Promise<EntitySeed> {
  const table =
    entityType === 'story' ? 'stories' : entityType === 'character' ? 'characters' : 'events';
  const column = entityType === 'character' ? 'name' : 'title';
  const bodyKey = entityType === 'story' ? 'content' : entityType === 'event' ? 'description' : null;

  const { data, error } = await supabase.from(table).select('*').eq('id', entityId).single();
  if (error) {
    throw error;
  }
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    title: String(row[column] ?? ''),
    status: String(row.status ?? ''),
    body: bodyKey ? ((row[bodyKey] as Json) ?? {}) : {},
  };
}

/**
 * Lazy entity bridge (REQ-FORUM-03.1 / 05.2): return the existing thread for a
 * story/character/event, or create it on first access. The thread's initial status
 * is derived from the underlying entity's approval status. No backfill.
 */
export async function getOrCreateThread(
  entityType: ThreadEntityType,
  entityId: string,
  creatorId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ thread: ThreadRow; created: boolean }> {
  const { data: existing } = await supabase
    .from('threads')
    .select('*')
    .eq('linked_entity_type', entityType)
    .eq('linked_entity_id', entityId)
    .maybeSingle();

  if (existing) {
    return { thread: existing, created: false };
  }

  const entity = await fetchEntity(entityType, entityId, supabase);

  const { data: created, error } = await supabase
    .from('threads')
    .insert({
      category_id: null,
      content_type: CONTENT_TYPES[entityType],
      title: entity.title,
      body: entity.body,
      author_id: creatorId,
      linked_entity_type: entityType,
      linked_entity_id: entityId,
      status: mapEntityStatusToThreadStatus(entityType, entity.status),
      is_locked: false,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { thread: created, created: true };
}

/**
 * Follow a thread for the given user (REQ-FOLLOW-01). `user_id` must equal
 * `auth.uid()` so the insert passes the thread_follows RLS WITH CHECK.
 */
export async function followThread(
  threadId: string,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from('thread_follows')
    .insert({ thread_id: threadId, user_id: userId });
  if (error) {
    throw error;
  }
}

/**
 * Unfollow a thread for the given user (REQ-FOLLOW-01). Scoped to the user so
 * the delete passes thread_follows RLS.
 */
export async function unfollowThread(
  threadId: string,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from('thread_follows')
    .delete()
    .eq('thread_id', threadId)
    .eq('user_id', userId);
  if (error) {
    throw error;
  }
}

/**
 * Toggle the in-app notification preference for a follow (REQ-FOLLOW-02). Scoped
 * to the thread and user so the update passes thread_follows RLS (own rows).
 */
export async function setFollowPreference(
  threadId: string,
  userId: string,
  notifyInApp: boolean,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from('thread_follows')
    .update({ notify_in_app: notifyInApp })
    .eq('thread_id', threadId)
    .eq('user_id', userId);
  if (error) {
    throw error;
  }
}

/**
 * Read the current follow state for a thread (REQ-FOLLOW-01). When no follow
 * exists the user is reported as not following with the default in-app preference
 * enabled.
 */
export async function getThreadFollow(
  threadId: string,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ following: boolean; notify_in_app: boolean }> {
  const { data, error } = await supabase
    .from('thread_follows')
    .select('notify_in_app')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data
    ? { following: true, notify_in_app: data.notify_in_app }
    : { following: false, notify_in_app: true };
}

/**
 * Count unread in-app notifications for a user (REQ-NOTIF-02). Unread is defined
 * as `read_at IS NULL`; this is the single source of truth for the bell badge.
 */
export async function getUnreadCount(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

/**
 * Mark every unread notification for a user as read (REQ-NOTIF-02 visit
 * center). Scoped to `user_id` and `read_at IS NULL` so the update passes the
 * notifications UPDATE RLS policy (recipient only) and leaves already-read
 * rows untouched. A visit to /notificaciones sets read_at=now() and the bell
 * badge drops to zero.
 */
export async function markNotificationsRead(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) {
    throw error;
  }
}
