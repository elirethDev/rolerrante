/**
 * Server-only audit reading via service_role (design AD-1).
 *
 * Reads audit_logs BYPASSING RLS (audit_logs is admin-only in RLS). This is a
 * server-only client created with SUPABASE_SERVICE_ROLE_KEY read at runtime from
 * `$env/dynamic/private` — never committed. When the key is absent (e.g. local
 * dev without the env var), every read degrades GRACEFULLY to `null` so the
 * audit banner renders empty and the GM analytics (derived from approved rows)
 * are unaffected.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import * as dynamicEnv from '$env/dynamic/private';
import type { Database } from './database.types';

export type ServiceRoleSupabase = SupabaseClient<Database>;

/** Shape returned by the loader / consumed by AuditBanner (design AD-1 banner). */
export interface AuditAction {
  action: string;
  entityType: string;
  entityId?: string;
  actor: string;
  createdAt: string;
}

/**
 * Build the service_role client, or `null` when the key is missing so callers can
 * degrade gracefully instead of throwing at runtime/import time.
 */
export function getServiceRoleClient(
  url: string = PUBLIC_SUPABASE_URL,
  key: string = dynamicEnv.env.SUPABASE_SERVICE_ROLE_KEY
): ServiceRoleSupabase | null {
  if (!key) return null;
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface AuditLogRow {
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  actor?: { display_name?: string | null; username?: string } | null;
}

/**
 * Fetch the most recent audit_logs entry via service_role, mapped to the banner
 * shape. Returns `null` when there is no client (graceful degradation) or no rows.
 */
export async function getLastAuditAction(
  client: Pick<ServiceRoleSupabase, 'from'> | null
): Promise<AuditAction | null> {
  if (!client) return null;
  const { data, error } = await client
    .from('audit_logs')
    .select('*, actor:actor_id(display_name, username)')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as AuditLogRow;
  return {
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actor: row.actor?.display_name ?? row.actor?.username ?? '',
    createdAt: row.created_at,
  };
}
