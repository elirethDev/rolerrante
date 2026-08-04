/** Semantic badge variants for audit actions (design AD-4 / spec R2). */
export type BadgeVariant = 'gold' | 'success' | 'danger' | 'blue' | 'neutral';

/**
 * Maps every current audit_action enum value to a semantic Badge variant.
 * Unknown/missing actions degrade to 'neutral' via badgeVariant() fallback.
 * `reabrir`/`suspender` are forward-compatible entries that stay neutral until
 * the enum is extended (design Open Question).
 */
export const AUDIT_BADGE_MAP: Record<string, BadgeVariant> = {
  // Aprobaciones
  aprobar: 'success',
  finalizar_evento: 'success',
  // Bloques/rechazos
  rechazar: 'danger',
  eliminar_post: 'danger',
  bloquear_hilo: 'danger',
  // Rol/permisos
  cambiar_rol: 'blue',
  desbloquear_hilo: 'blue',
  editar_permisos: 'blue',
  // Recompensas
  otorgar_xp: 'gold',
  // Ediciones neutras
  editar: 'neutral',
  editar_catalogo: 'neutral',
  editar_settings: 'neutral',
  crear_hilo: 'neutral',
  editar_post: 'neutral',
  // Forward-compatible: degrade until enum extended
  reabrir: 'neutral',
  suspender: 'neutral',
};

/** Resolve the BadgeVariant for an action, defaulting to neutral. */
export function badgeVariant(action: string): BadgeVariant {
  return AUDIT_BADGE_MAP[action] ?? 'neutral';
}

const LABELS: Record<string, string> = {
  aprobar: 'Aprobación',
  rechazar: 'Rechazo',
  editar: 'Edición',
  otorgar_xp: 'Otorgar XP',
  finalizar_evento: 'Finalizar evento',
  cambiar_rol: 'Rol',
  editar_catalogo: 'Editar catálogo',
  editar_settings: 'Editar ajustes',
  crear_hilo: 'Crear hilo',
  editar_post: 'Editar post',
  eliminar_post: 'Eliminar post',
  bloquear_hilo: 'Bloqueo',
  desbloquear_hilo: 'Desbloquear hilo',
  editar_permisos: 'Editar permisos',
  reabrir: 'Reapertura',
  suspender: 'Suspender',
};

/** Human-readable Spanish label for an audit action (falls back to the raw action). */
export function badgeLabel(action: string): string {
  return LABELS[action] ?? action;
}
