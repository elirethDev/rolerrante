import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WorklistCard from './WorklistCard.svelte';
import type { WorklistItem } from './types';

// Spec gm-worklist R3: wl-card row with entity type icon, entity name, author,
// age, stale mark, inline action buttons; R5: detail route reachable.

const item = (over: Partial<WorklistItem> = {}): WorklistItem => ({
  id: '1',
  type: 'ficha',
  name: 'Ficha de prueba',
  author: 'Autor GM',
  createdAt: '2026-01-01T00:00:00Z',
  stale: false,
  detailHref: '/fichas/1',
  entityId: '1',
  ...over,
});

describe('WorklistCard', () => {
  it('renders entity name as a link to its detail route and the author', () => {
    render(WorklistCard, { item: item() });
    expect(screen.getByRole('link', { name: 'Ficha de prueba' })).toHaveAttribute(
      'href',
      '/fichas/1',
    );
    expect(screen.getByText('Autor GM')).toBeInTheDocument();
  });

  it('renders the relative submission age', () => {
    const recent = new Date(Date.now() - 2000).toISOString();
    render(WorklistCard, { item: item({ createdAt: recent }) });
    expect(screen.getByTestId('wl-age')).toHaveTextContent('hace un momento');
  });

  it('shows the stale mark with the 48h wording when stale and hides it when fresh', () => {
    const { unmount } = render(WorklistCard, { item: item({ stale: true }) });
    expect(screen.getByTestId('wl-stale')).toHaveTextContent('Sin respuesta > 48 h');
    unmount();

    render(WorklistCard, { item: item({ stale: false }) });
    expect(screen.queryByTestId('wl-stale')).not.toBeInTheDocument();
  });

  it('does not render the reject button for events (reject is unsupported for events)', () => {
    render(WorklistCard, { item: item({ type: 'evento' }) });
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar evento' })).toBeInTheDocument();
  });

  it('renders the reject button for ficha/cronica/solicitud', () => {
    for (const type of ['ficha', 'cronica', 'solicitud'] as const) {
      const { unmount } = render(WorklistCard, { item: item({ type }) });
      expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
      unmount();
    }
  });

  it('disables approve/reject while busy and keeps review enabled', () => {
    render(WorklistCard, { item: item(), busy: true });
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aprobar ficha' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Revisar' })).not.toBeDisabled();
  });

  it('emits reject/review/approve callbacks with the item', async () => {
    const onReject = vi.fn();
    const onReview = vi.fn();
    const onApprove = vi.fn();
    const it = item();
    render(WorklistCard, { item: it, onReject, onReview, onApprove });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    await user.click(screen.getByRole('button', { name: 'Revisar' }));
    await user.click(screen.getByRole('button', { name: 'Aprobar ficha' }));

    expect(onReject).toHaveBeenCalledWith(it);
    expect(onReview).toHaveBeenCalledWith(it);
    expect(onApprove).toHaveBeenCalledWith(it);
  });

  it('renders the author avatar initial in place of a generic icon', () => {
    render(WorklistCard, { item: item({ author: 'Terencio' }) });
    expect(screen.queryByTestId('wl-icon')).not.toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it.each([
    ['ficha', 'Aprobar ficha'],
    ['cronica', 'Aprobar crónica'],
    ['evento', 'Publicar evento'],
    ['solicitud', 'Aprobar habilidad'],
  ] as const)('uses a %s-specific approve label (%s)', (type, label) => {
    const { unmount } = render(WorklistCard, { item: item({ type }) });
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    unmount();
  });

  it('renders a gold done badge instead of the action buttons when done', () => {
    render(WorklistCard, { item: item(), done: true });
    expect(screen.getByTestId('wl-done')).toHaveTextContent('Aprobado');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['ficha', 'Ficha'],
    ['cronica', 'Crónica'],
    ['evento', 'Evento'],
    ['solicitud', 'Solicitud'],
  ] as const)('renders the %s type tag (%s)', (type, label) => {
    const { unmount } = render(WorklistCard, { item: item({ type }) });
    expect(screen.getByTestId('wl-type')).toHaveTextContent(label);
    unmount();
  });

  it('toggles the inline notes editor from the Comentar button', async () => {
    const { unmount } = render(WorklistCard, { item: item() });
    const user = userEvent.setup();
    expect(screen.queryByTestId('wl-notes')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('wl-comment'));
    expect(screen.getByTestId('wl-notes')).toBeInTheDocument();
    await user.click(screen.getByTestId('wl-comment'));
    expect(screen.queryByTestId('wl-notes')).not.toBeInTheDocument();
    unmount();
  });

  it('passes a typed inline note to approve and reject', async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const it = item();
    render(WorklistCard, { item: it, onApprove, onReject });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('wl-comment'));
    await user.type(screen.getByTestId('wl-notes'), 'Falta contexto canónico');
    await user.click(screen.getByRole('button', { name: 'Aprobar ficha' }));
    expect(onApprove).toHaveBeenCalledWith(it, 'Falta contexto canónico');

    await user.clear(screen.getByTestId('wl-notes'));
    await user.type(screen.getByTestId('wl-notes'), 'Razón del rechazo');
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(onReject).toHaveBeenCalledWith(it, 'Razón del rechazo');
  });
});
