import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { Check } from 'lucide-svelte';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.svelte';

describe('EmptyState', () => {
  it('renders title in an h3', () => {
    render(EmptyState, { title: 'Sin resultados' });
    expect(screen.getByRole('heading', { level: 3, name: 'Sin resultados' })).toBeInTheDocument();
  });

  it('renders description when provided, hides when omitted', () => {
    const { unmount } = render(EmptyState, { title: 'T', description: 'Descripción aquí' });
    expect(screen.getByText('Descripción aquí')).toBeInTheDocument();
    unmount();

    render(EmptyState, { title: 'T' });
    expect(screen.queryByText('Descripción aquí')).not.toBeInTheDocument();
  });

  it('renders children snippet when provided, hides when omitted', () => {
    const snippet = createRawSnippet(() => ({ render: () => '<button>Acción</button>' }));
    const { unmount } = render(EmptyState, { title: 'T', children: snippet });
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
    unmount();

    render(EmptyState, { title: 'T' });
    expect(screen.queryByRole('button', { name: 'Acción' })).not.toBeInTheDocument();
  });

  it('renders icon element when provided, hides when omitted', () => {
    const { unmount } = render(EmptyState, { title: 'T', icon: Check });
    expect(document.querySelector('svg')).toBeInTheDocument();
    unmount();

    render(EmptyState, { title: 'T' });
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });
});
