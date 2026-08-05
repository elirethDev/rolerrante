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

describe('CategoryTree', () => {
  it('renders root and nested subcategory names', () => {
    render(CategoryTree, {
      categories: [
        cat({ id: 'r1', name: 'General' }),
        cat({ id: 'r2', name: 'Rol', children: [cat({ id: 's1', name: 'Debates' })] }),
      ],
    });
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Debates')).toBeInTheDocument();
  });

  it('marks categories the viewer cannot see with a hidden attribute', () => {
    const noView = { ...flags, can_view: false };
    render(CategoryTree, {
      categories: [cat({ id: 'r1', name: 'Visible', flags }), cat({ id: 'r2', name: 'NoVisible', flags: noView })],
    });
    expect(screen.getByText('Visible')).toBeInTheDocument();
    const hidden = document.querySelector('[data-category-hidden]');
    expect(hidden).not.toBeNull();
    expect(hidden).toHaveAttribute('data-category-hidden', 'true');
    expect(document.querySelector('[data-category-hidden]')?.textContent).toContain('NoVisible');
  });

  it('renders only subcategories the viewer can see', () => {
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
    expect(screen.getByText('VisibleChild')).toBeInTheDocument();
    expect(screen.queryByText('HiddenChild')).not.toBeInTheDocument();
  });

  it('renders Temas/Mensajes counts and last-post avatar+author (REQ-FORUM-02.1)', () => {
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
              lastPost: { avatar_url: 'https://x/avatar.png', author_display_name: 'Nyx' },
            },
          ],
        }),
      ],
    });
    expect(screen.getByText('Debates')).toBeInTheDocument();
    expect(screen.getByText('Temas 3')).toBeInTheDocument();
    expect(screen.getByText('Mensajes 12')).toBeInTheDocument();
    // Last post shows both an author name (behavioral) — avatar is present via image alt.
    expect(screen.getByText('Nyx')).toBeInTheDocument();
    const avatar = document.querySelector('img[alt="Último mensaje de Nyx"]');
    expect(avatar).not.toBeNull();
    expect(avatar).toHaveAttribute('src', 'https://x/avatar.png');
  });

  it('shows Temas 0 / Mensajes 0 with no last-post for an empty category', () => {
    render(CategoryTree, {
      categories: [
        cat({
          id: 'r1',
          name: 'General',
          children: [
            {
              ...cat({ id: 'sub1', name: 'Vacía' }),
              threads_count: 0,
              posts_count: 0,
              lastPost: null,
            },
          ],
        }),
      ],
    });
    expect(screen.getByText('Temas 0')).toBeInTheDocument();
    expect(screen.getByText('Mensajes 0')).toBeInTheDocument();
    expect(screen.queryByAltText(/Último mensaje de/)).not.toBeInTheDocument();
  });
});
