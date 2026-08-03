import { redirect } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type { UserRole, Profile } from './types';
import type { Database } from './supabase/database.types';

type AuthLocals = { user: User | null; profile: Profile | null };

export function requireAuth(locals: AuthLocals) {
  if (!locals.user) {
    throw redirect(303, '/login');
  }
}

export function requireRole(locals: AuthLocals, roles: UserRole[]) {
  requireAuth(locals);
  if (!roles.includes(locals.profile?.role ?? 'pendiente')) {
    throw redirect(303, '/');
  }
}

export function isGMOrAdmin(role?: UserRole | null) {
  return role === 'gm' || role === 'admin';
}

export function isAdmin(role?: UserRole | null) {
  return role === 'admin';
}

export type PermissionFlags = {
  can_view: boolean;
  can_post: boolean;
  can_edit: boolean;
  can_lock: boolean;
};

export type PermissionInput = {
  section: PermissionFlags | null;
  thread: PermissionFlags | null;
  role: UserRole;
};

const ROLE_DEFAULTS: Record<UserRole, PermissionFlags> = {
  // Guests (pendiente) are read-only by default; can_view only when granted by admin.
  pendiente: { can_view: false, can_post: false, can_edit: false, can_lock: false },
  rolero: { can_view: true, can_post: true, can_edit: false, can_lock: false },
  gm: { can_view: true, can_post: true, can_edit: true, can_lock: true },
  admin: { can_view: true, can_post: true, can_edit: true, can_lock: true },
};

/**
 * Merge section-level + thread-level permission flags with the role defaults.
 * A thread override wins over the section default; can_lock stays GM/admin-only
 * (an author can never lock their own thread, REQ-FORUM-04.3).
 */
export function resolveEffectivePermissions({
  section,
  thread,
  role,
}: PermissionInput): PermissionFlags {
  let flags: PermissionFlags = { ...ROLE_DEFAULTS[role] };
  if (section) flags = { ...flags, ...section };
  if (thread) flags = { ...flags, ...thread };
  flags.can_lock = flags.can_lock && isGMOrAdmin(role);
  return flags;
}

/**
 * Server-side validation of image links inside TipTap HTML (REQ-FORUM-03.5).
 * Only http/https URLs are accepted; javascript:, data:, file: and any other
 * scheme (or a relative path) is rejected.
 */
export function validateForumImageUrls(html: string): { valid: boolean; rejected: string[] } {
  const rejected: string[] = [];
  const imgRe = /<img[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRe.exec(html)) !== null) {
    const url = match[1].trim();
    if (!/^https?:\/\//i.test(url)) rejected.push(url);
  }
  return { valid: rejected.length === 0, rejected };
}

/**
 * Server-side validation of anchor hrefs inside TipTap HTML (REQ-FORUM-03.5 /
 * REQ-FC-03). Only http/https URLs are accepted; javascript:, data:, file:,
 * relative paths and any unknown scheme are rejected. Mirrors
 * validateForumImageUrls.
 */
export function validateForumHrefs(html: string): { valid: boolean; rejected: string[] } {
  const rejected: string[] = [];
  const aRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = aRe.exec(html)) !== null) {
    const href = match[1].trim();
    if (!/^https?:\/\//i.test(href)) rejected.push(href);
  }
  return { valid: rejected.length === 0, rejected };
}

export interface SanctionRow {
  kind: string;
  active_until: string | null;
}

/**
 * A moderator sanction is active when it is a permanent ban (kind=ban, no
 * expiry) or when it is a timed suspension whose active_until is still in the
 * future (REQ-MOD-ENF-03.1). Expired suspensions stop blocking forum access.
 * A suspension with a missing or malformed (non-parseable) active_until is
 * treated as ACTIVE so the gate fails CLOSED instead of silently allowing.
 */
export function hasActiveSanction(sanction: SanctionRow | null): boolean {
  if (!sanction) return false;
  if (sanction.kind === 'ban') return true;
  const activeUntilTime = sanction.active_until
    ? new Date(sanction.active_until).getTime()
    : Number.NaN;
  return Number.isNaN(activeUntilTime) || activeUntilTime > Date.now();
}

/**
 * Central forum-access gate (REQ-MOD-ENF-03): a suspended or banned user is
 * denied access to every /foro route. Returns true (allowed) unless there is an
 * active sanction for this profile. FAILS CLOSED: a query error denies access
 * rather than allowing a possibly-sanctioned user through.
 */
export async function forumAccessAllowed(
  supabase: SupabaseClient<Database>,
  profile: Profile,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_sanctions')
    .select('kind, active_until')
    .eq('user_id', profile.id)
    .or('kind.eq.ban,active_until.gt.' + new Date().toISOString())
    .maybeSingle();
  if (error) {
    console.error('forumAccessAllowed: no se pudo leer sanciones, denegando acceso', error);
    return false;
  }
  return !hasActiveSanction(data as SanctionRow | null);
}

/**
 * Map the currently-active sanctions for a set of users (keyed by user_id), so
 * the moderation queue can show sanction state for each reported user. Only
 * rows that are still active (ban, or suspension with active_until in the
 * future) are returned ÔÇö matching the forumAccessAllowed gate. Degrades to an
 * empty map on query error so the queue still renders.
 */
export async function listActiveSanctions(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Record<string, SanctionRow>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase
    .from('user_sanctions')
    .select('user_id, kind, active_until')
    .in('user_id', userIds)
    .or('kind.eq.ban,active_until.gt.' + new Date().toISOString());
  if (error) {
    console.error('listActiveSanctions: no se pudieron leer sanciones', error);
    return {};
  }
  const byUser: Record<string, SanctionRow> = {};
  for (const row of data ?? []) {
    byUser[row.user_id] = { kind: row.kind, active_until: row.active_until };
  }
  return byUser;
}

/**
 * Single-URL variant of the forum image validator (REQ-CAV-01.2). Allows
 * null/undefined/empty (avatar cleared) and any http: or https: URL; rejects
 * every other scheme (javascript:, data:, file:, unknown, relative paths).
 */
export function validateImageUrl(url: string | null | undefined): { valid: boolean; rejected?: string } {
  if (!url || url.trim() === "") {
    return { valid: true };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { valid: false, rejected: url };
  }
  return { valid: true };
}
