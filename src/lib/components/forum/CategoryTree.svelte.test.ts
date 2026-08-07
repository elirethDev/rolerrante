import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { CategoryNode } from '$lib/forum';
import CategoryTree from './CategoryTree.svelte';

const flags = { can_view: true, can_post: true, can_edit: false, can_lock: false };

function cat(partial: Partial<CategoryNode> & Pick<CategoryNode, 'id' | 'name'>): CategoryNode {
  return {
    id: partial.id,
    name: partial.name,
    description: partial.description ?? null,
    is_visible: partial.is_visible ?? true,
    min_read_role: partial.min_read_role ?? null,
    requires_approval: partial.requires_approval ?? false,
    flags: partial.flags ?? flags,
    children: partial.children ?? [],
    threads: partial.threads ?? [],
    threads_count: partial.threads_count ?? 0,
    posts_count: partial.posts_count ?? 0,
    lastPost: partial.lastPost ?? null,
  };
}

describe('CategoryTree (OD forum-index rows)', () => {
  it('renders each root as a forum-group and every child as a row linking to /foro/categoria/[id]', () => {
    render(CategoryTree, {
      categories: [
        cat({
          id: 'r1',
          name: 'El Salón del Consejo',
          children: [cat({ id: 's1', name: 'Anuncios del reino', description: 'Avisos oficiales' })],
        }),
      ],
    });
    expect(
      screen.getByRole('heading', { level: 2, name: 'El Salón del Consejo' }),
    ).toBeInTheDocument();
    const row = screen.getByTestId('forum-row');
    expect(row.tagName).toBe('ARTICLE');
    const link = screen.getByRole('link', { name: /Anuncios del reino/ });
    expect(link.getAttribute('href')).toBe('/foro/categoria/s1');
  });

  it('hides sections the viewer cannot view instead of marking them', () => {
    const noView = { ...flags, can_view: false };
    render(CategoryTree, {
      categories: [
        cat({
          id: 'r1',
          name: 'General',
          children: [cat({ id: 'ok', name: 'VisibleChild', flags }), cat({ id: 'no', name: 'HiddenChild', flags: noView })],
        }),
      ],
    });
    expect(screen.getByRole('link', { name: /VisibleChild/ })).toBeInTheDocument();
    expect(screen.queryByText('HiddenChild')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('forum-row')).toHaveLength(1);
  });

  it('shows Temas/Mensajes counts and a last-post with thread title + author + time-ago', () => {
    render(CategoryTree, {
      categories: [
        cat({
          id: 'r1',
          name: 'General',
          children: [
            {
              ...cat({ id: 'sub1', name: 'Debates' }),
              threads_count: 3,
              posts_count: 12,
              lastPost: {
                avatar_url: 'https://x/avatar.png',
                author_display_name: 'Nyx',
                thread_title: 'Convocatoria de otoño',
                thread_id: 't9',
                created_at: new Date().toISOString(),
              },
            },
          ],
        }),
      ],
    });
    const stats = screen.getByTestId('forum-stats');
    expect(stats).toHaveTextContent('3temas');
    expect(stats).toHaveTextContent('12mensajes');
    // The last-post row links straight to the thread and shows author + "hace".
    const lastLink = screen.getByTestId('last-thread-link');
    expect(lastLink.getAttribute('href')).toBe('/foro/t9');
    expect(screen.getByText('Convocatoria de otoño')).toBeInTheDocument();
    const lpMeta = document.querySelector('.lp-meta');
    expect(lpMeta?.textContent).toContain('Nyx');
    expect(lpMeta?.textContent).toContain('hace');
  });

  it('aggregates department counts into the forum-cat header', () => {
    render(CategoryTree, {
      categories: [
        cat({
          id: 'r1',
          name: 'El Salón',
          description: 'Gobernanza de la comunidad',
          children: [
            { ...cat({ id: 's1', name: 'A' }), threads_count: 2, posts_count: 5 },
            { ...cat({ id: 's2', name: 'B' }), threads_count: 3, posts_count: 7 },
          ],
        }),
      ],
    });
    const header = screen.getByTestId('forum-cat');
    expect(header).toHaveTextContent('Gobernanza de la comunidad');
    expect(header).toHaveTextContent('5temas');
    expect(header).toHaveTextContent('12mensajes');
  });

  it('a root without children links its title and shows its name in the row', () => {
    render(CategoryTree, {
      categories: [cat({ id: 'r1', name: 'General', description: 'Charlas libres', threads_count: 2, posts_count: 4 })],
    });
    const title = screen.getByRole('heading', { level: 2, name: 'General' });
    const titleLink = title.querySelector('a');
    expect(titleLink).not.toBeNull();
    expect(titleLink?.getAttribute('href')).toBe('/foro/categoria/r1');
    // The leaf row shows the category's own name (not a hardcoded label) so the
    // admin-defined section name is what the users see.
    const row = screen.getByTestId('forum-row');
    expect(row).toHaveTextContent('General');
    expect(row.querySelector('a')?.getAttribute('href')).toBe('/foro/categoria/r1');
  });

  it('does not link a root title when it has children (navigation lives in the rows)', () => {
    render(CategoryTree, {
      categories: [cat({ id: 'r1', name: 'General', children: [cat({ id: 's1', name: 'Debates' })] })],
    });
    const title = screen.getByRole('heading', { level: 2, name: 'General' });
    expect(title.querySelector('a')).toBeNull();
  });

  it('shows Sin actividad for a section with no last post', () => {
    render(CategoryTree, {
      categories: [cat({ id: 'r1', name: 'General', children: [cat({ id: 's1', name: 'Vacía' })] })],
    });
    expect(screen.getByText('Sin actividad')).toBeInTheDocument();
  });
});