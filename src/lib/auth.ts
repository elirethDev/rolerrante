import { redirect } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
import type { UserRole, Profile } from './types';

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
