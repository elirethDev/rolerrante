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

export type RpcResult = { error: null } | { error: string };

/**
 * Report a post (REQ-MOD-REP-01): insert a report row attributed to the
 * authenticated caller (reporter_id is taken from the session, never from
 * caller input — prevents reporter spoofing), then fire the reportar audit.
 * Returns an error result on failure.
 */
export async function reportPost(
  supabase: SupabaseClient<Database>,
  postId: string,
  reason: string,
  justification?: string,
): Promise<RpcResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data, error } = await supabase
    .from('reports')
    .insert({
      post_id: postId,
      reporter_id: user.id,
      reason,
      justification: justification ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: 'No se pudo crear el reporte' };

  await supabase.rpc('log_audit', {
    p_action: 'reportar',
    p_entity_type: 'report',
    p_entity_id: data.id,
    p_details: { post_id: postId, reason },
  });

  return { error: null };
}

/** Suspend a user's forum access until activeUntil (REQ-MOD-ENF-01). */
export async function suspendUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  activeUntil: string,
  justification: string,
): Promise<RpcResult> {
  const { error } = await supabase.rpc('suspend_user', {
    p_user_id: userId,
    p_active_until: activeUntil,
    p_justification: justification,
  });
  return error ? { error: error.message } : { error: null };
}

/** Permanently ban a user from the forum (REQ-MOD-ENF-02). */
export async function banUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  justification: string,
): Promise<RpcResult> {
  const { error } = await supabase.rpc('ban_user', {
    p_user_id: userId,
    p_justification: justification,
  });
  return error ? { error: error.message } : { error: null };
}

/** Resolve or discard an open report (REQ-MOD-REP-02). */
export async function resolveReport(
  supabase: SupabaseClient<Database>,
  reportId: string,
  status: 'resuelta' | 'descartada',
  justification: string,
): Promise<RpcResult> {
  const { error } = await supabase.rpc('resolve_report', {
    p_report_id: reportId,
    p_status: status,
    p_justification: justification,
  });
  return error ? { error: error.message } : { error: null };
}

export interface ReportListItem {
  id: string;
  reason: string;
  justification: string | null;
  status: string;
  created_at: string;
  reporter: { id: string; display_name: string | null; username: string } | null;
  post: { id: string; thread_id: string; post_number: number } | null;
}

/**
 * List open (abierta) reports for the admin queue (REQ-MOD-REP-02.1), each with
 * the reporter and the linked post so the queue can show a post link. RLS
 * restricts SELECT to admins (plus the reporter's own rows via the self-select
 * policy, so a non-admin calling this sees their own only - callers should
 * require staff). Returns the list plus an optional error message.
 */
export async function listReports(
  supabase: SupabaseClient<Database>,
): Promise<{ data: ReportListItem[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, reason, justification, status, created_at, reporter:reporter_id(id, display_name, username), post:post_id(id, thread_id, post_number)',
    )
    .eq('status', 'abierta')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as unknown as ReportListItem[], error: null };
}
