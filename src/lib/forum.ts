import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './supabase/database.types';
import type { PermissionFlags } from './auth';

export type ThreadEntityType = 'story' | 'character' | 'event';
export type ThreadRow = Database['public']['Tables']['threads']['Row'];
export type ThreadStatus = Database['public']['Enums']['thread_status'];
export interface ThreadListItem {
  id: string;
  title: string;
  content_type: string;
  status: string;
  is_locked: boolean;
  created_at: string;
  edited_at: string | null;
  category_id: string | null;
}

export interface CategoryNode {
  id: string;
  name: string;
  description: string | null;
  is_visible: boolean;
  children: CategoryNode[];
  flags: PermissionFlags;
  threads: ThreadListItem[];
}

export interface AuthorRef {
  id: string;
  display_name?: string | null;
  username?: string;
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
