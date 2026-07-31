import { redirect } from '@sveltejs/kit';
import type { UserRole } from './types';

export function requireAuth(locals: App.Locals) {
  if (!locals.user) {
    throw redirect(303, '/login');
  }
}

export function requireRole(locals: App.Locals, roles: UserRole[]) {
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
