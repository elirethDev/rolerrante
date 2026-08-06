import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';

const story = {
  id: 's1',
  title: 'Un viaje por el valle',
  status: 'aprobado',
  created_at: '2026-01-01T00:00:00Z',
  character: {
    id: 'c1',
    name: 'Aragorn',
    player: { id: 'u1', display_name: 'Pablo', username: 'pablo' },
  },
};

const base = {
  stories: [story],
  counts: { todas: 3, aprobado: 1, pendiente: 1, borrador: 0, mias: 1 },
  tab: 'todas',
  q: '',
  profile: { id: 'u1', role: 'rolero' },
};

describe('historias/+page.svelte — "Mis historias" tab and search', () => {
  it('shows the "Mis historias" tab to a logged-in player', () => {
    render(Page, { data: base as never });
    expect(screen.getByRole('tab', { name: /mis historias/i })).toBeInTheDocument();
  });

  it('hides the "Mis historias" tab from a guest', () => {
    render(Page, { data: { ...base, profile: null } as never });
    expect(screen.queryByRole('tab', { name: /mis historias/i })).not.toBeInTheDocument();
  });

  it('renders the search input and a "Limpiar filtros" link when a query is active', () => {
    render(Page, { data: { ...base, q: 'viaje' } as never });
    expect(screen.getByLabelText(/buscar historias/i)).toHaveValue('viaje');
    expect(screen.getByText(/limpiar filtros/i)).toHaveAttribute('href', '/historias');
  });
});
