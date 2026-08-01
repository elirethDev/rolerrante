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
