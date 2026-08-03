import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AuditActionBadge from './AuditActionBadge.svelte';

// Spec audit-activity-surfacing R2/R3: per-action semantic badge renders on
// audit rows; unknown actions fall back to neutral with the action label text.

describe('AuditActionBadge', () => {
  it('renders the Spanish label for a known mapped action', () => {
    render(AuditActionBadge, { action: 'aprobar' });
    expect(screen.getByText('Aprobación')).toBeInTheDocument();
  });

  it('renders the label for a danger action', () => {
    render(AuditActionBadge, { action: 'bloquear_hilo' });
    expect(screen.getByText('Bloqueo')).toBeInTheDocument();
  });

  it('falls back to the raw action text for an unmapped action', () => {
    render(AuditActionBadge, { action: 'crear_hilo' });
    expect(screen.getByText('Crear hilo')).toBeInTheDocument();
  });
});
