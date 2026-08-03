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

export interface SanctionRow {
  kind: string;
  active_until: string | null;
}

/**
 * A moderator sanction is active when it is a permanent ban (kind=ban, no
 * expiry) or when it is a timed suspension whose active_until is still in the
 * future (REQ-MOD-ENF-03.1). Expired suspensions stop blocking forum access.
 */
export function hasActiveSanction(sanction: SanctionRow | null): boolean {
  if (!sanction) return false;
  if (sanction.kind === 'ban') return true;
  return (
    sanction.active_until !== null &&
    new Date(sanction.active_until).getTime() > Date.now()
  );
}

/**
 * Central forum-access gate (REQ-MOD-ENF-03): a suspended or banned user is
 * denied access to every /foro route. Returns true (allowed) unless there is an
 * active sanction for this profile.
 */
export async function forumAccessAllowed(
  supabase: SupabaseClient<Database>,
  profile: Profile,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_sanctions')
    .select('kind, active_until')
    .eq('user_id', profile.id)
    .or('kind.eq.ban,active_until.gt.' + new Date().toISOString())
    .maybeSingle();
  return !hasActiveSanction(data as SanctionRow | null);
}
