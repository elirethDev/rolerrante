import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { PageData } from './$types';
import CategoriaPage from './+page.svelte';

const flags = { can_view: true, can_post: true, can_edit: false, can_lock: false };

const thread = (p: Partial<Record<string, unknown>> = {}) => ({
  id: 't1',
  title: 'Hilo uno',
  content_type: 'debate',
  status: 'abierto',
  is_locked: false,
  is_sticky: false,
  created_at: '2026-08-02T00:00:00Z',
  edited_at: null,
  category_id: 'c1',
  posts_count: 3,
  author: { id: 'u1', display_name: 'Gareth', username: 'gareth' },
  lastPost: {
    avatar_url: null,
    author_display_name: 'Nyx',
    thread_title: 'Hilo uno',
    created_at: new Date().toISOString(),
  },
  ...p,
});

const makeData = (overrides: Record<string, unknown> = {}) =>
  ({
    category: { id: 'c1', name: 'Debates', description: 'Discusión general', requires_approval: false, parent_id: null },
    trail: [{ id: 'c1', name: 'Debates' }],
    children: [],
    threads: [],
    totalThreads: 0,
    totalPages: 1,
    currentPage: 1,
    flags,
    roleLabel: 'rolero',
    isAdmin: false,
    isStaff: false,
    ...overrides,
  }) as unknown as PageData;

function renderPage(data: PageData) {
  return render(CategoriaPage, { data });
}

describe('/foro/categoria/[id] +page.svelte (per-section thread list)', () => {
  it('renders breadcrumbs Foro / section name', () => {
    renderPage(makeData());
    const home = screen.getByRole('link', { name: 'Foro' });
    expect(home.getAttribute('href')).toBe('/foro');
    expect(screen.getByRole('heading', { name: 'Debates' })).toBeInTheDocument();
    expect(screen.getByText(/Discusión general/)).toBeInTheDocument();
  });

  it('links every thread row to /foro/[threadId] and shows pin/lock badges', () => {
    renderPage(
      makeData({
        threads: [thread({ is_sticky: true, is_locked: true })],
        totalThreads: 1,
      }),
    );
    const link = screen.getByRole('link', { name: /Hilo uno/ });
    expect(link.getAttribute('href')).toBe('/foro/t1');
    expect(screen.getByTestId('pin-badge')).toBeInTheDocument();
    expect(screen.getByTestId('lock-badge')).toBeInTheDocument();
    expect(screen.getByText('por Gareth')).toBeInTheDocument();
  });

  it('shows reply count and last-post author with relative time', () => {
    renderPage(makeData({ threads: [thread()], totalThreads: 1 }));
    expect(screen.getByText('3 mensajes')).toBeInTheDocument();
    const last = screen.getByTestId('last-post');
    expect(last).toHaveTextContent('Nyx');
    expect(last).toHaveTextContent(/hace/);
  });

  it('shows the empty state when the section has no threads', () => {
    renderPage(makeData());
    expect(screen.getByText('Todavía no hay hilos')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Hilo uno/ })).not.toBeInTheDocument();
  });

  it('links child sections as sub-navigation', () => {
    renderPage(
      makeData({
        children: [
          { id: 'c2', name: 'Hogar', description: null },
          { id: 'c3', name: 'Sala', description: null },
        ],
      }),
    );
    const links = screen.getAllByTestId('child-section-link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/foro/categoria/c2');
  });

  it('offers "Nuevo debate" pre-selecting this section when the role can post', () => {
    renderPage(makeData());
    const nuevo = screen.getByTestId('new-thread-link');
    expect(nuevo.getAttribute('href')).toBe('/foro/nuevo?categoria=c1');
  });

  it('hides "Nuevo debate" when the role cannot post', () => {
    renderPage(makeData({ flags: { ...flags, can_post: false } }));
    expect(screen.queryByTestId('new-thread-link')).not.toBeInTheDocument();
  });

  it('renders pagination links when there is more than one page', () => {
    renderPage(makeData({ threads: [thread()], totalThreads: 21, totalPages: 2, currentPage: 1 }));
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    const next = screen.getByRole('link', { name: 'Siguiente' });
    expect(next.getAttribute('href')).toBe('/foro/categoria/c1?page=2');
  });
});