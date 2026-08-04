import { describe, expect, it } from 'vitest';
import {
  AUDIT_BADGE_MAP,
  badgeLabel,
  badgeVariant,
} from './badges';

// Design AD-4: lookup table (AUDIT_BADGE_MAP) shared by AuditActionBadge.
// Spec audit-activity-surfacing R2: reabrir→gold, aprobar→success,
// bloquear_hilo/suspender→danger, cambiar_rol→blue, unmapped→neutral default.

describe('badges', () => {
  it('maps semantic actions to their spec variants', () => {
    expect(AUDIT_BADGE_MAP.aprobar).toBe('success');
    expect(AUDIT_BADGE_MAP.finalizar_evento).toBe('success');
    expect(AUDIT_BADGE_MAP.rechazar).toBe('danger');
    expect(AUDIT_BADGE_MAP.eliminar_post).toBe('danger');
    expect(AUDIT_BADGE_MAP.bloquear_hilo).toBe('danger');
    expect(AUDIT_BADGE_MAP.cambiar_rol).toBe('blue');
    expect(AUDIT_BADGE_MAP.desbloquear_hilo).toBe('blue');
    expect(AUDIT_BADGE_MAP.editar_permisos).toBe('blue');
    expect(AUDIT_BADGE_MAP.otorgar_xp).toBe('gold');
  });

  it('keeps reabrir/suspender forward-compatible as neutral until enum extends', () => {
    expect(AUDIT_BADGE_MAP.reabrir).toBe('neutral');
    expect(AUDIT_BADGE_MAP.suspender).toBe('neutral');
  });

  it('covers every current audit_action enum value', () => {
    const currentEnum = [
      'aprobar',
      'rechazar',
      'editar',
      'otorgar_xp',
      'finalizar_evento',
      'cambiar_rol',
      'editar_catalogo',
      'editar_settings',
      'crear_hilo',
      'editar_post',
      'eliminar_post',
      'bloquear_hilo',
      'desbloquear_hilo',
      'editar_permisos',
    ];
    for (const action of currentEnum) {
      expect(AUDIT_BADGE_MAP, `missing ${action}`).toHaveProperty(action);
    }
  });

  it('badgeVariant falls back to neutral for unknown actions', () => {
    expect(badgeVariant('crear_hilo')).toBe('neutral');
    expect(badgeVariant('editar_settings')).toBe('neutral');
    expect(badgeVariant('completely_unknown_action')).toBe('neutral');
  });

  it('badgeLabel returns Spanish labels for known actions and falls back to the action', () => {
    expect(badgeLabel('reabrir')).toBe('Reapertura');
    expect(badgeLabel('aprobar')).toBe('Aprobación');
    expect(badgeLabel('bloquear_hilo')).toBe('Bloqueo');
    expect(badgeLabel('cambiar_rol')).toBe('Rol');
    expect(badgeLabel('123_no_existe')).toBe('123_no_existe');
  });
});
