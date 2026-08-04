import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AuditBanner from './AuditBanner.svelte';

// Spec audit-activity-surfacing R1: last-action banner displays actor name,
// action label, entity reference, and relative timestamp.

const base = {
  actor: 'Aria',
  action: 'aprobar',
  entityType: 'ficha',
  entityId: 'abc-123-def',
  createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
};

describe('AuditBanner', () => {
  it('renders actor, action label, entity, and relative time', () => {
    render(AuditBanner, base);
    expect(screen.getByText('Aria')).toBeInTheDocument();
    expect(screen.getByText('Aprobación')).toBeInTheDocument();
    expect(screen.getByText(/ficha/)).toBeInTheDocument();
    expect(screen.getByText(/hace/)).toBeInTheDocument();
  });

  it('wraps the action in the AuditActionBadge', () => {
    render(AuditBanner, { ...base, action: 'bloquear_hilo' });
    expect(screen.getByTestId('audit-action-badge')).toBeInTheDocument();
    expect(screen.getByText('Bloqueo')).toBeInTheDocument();
  });

  it('omits the entity id segment when entityId is absent', () => {
    render(AuditBanner, { ...base, entityId: '' });
    expect(screen.queryByText('abc-123-def')).not.toBeInTheDocument();
  });
});
