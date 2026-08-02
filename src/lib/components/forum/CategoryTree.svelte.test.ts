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
    flags: partial.flags ?? flags,
    children: partial.children ?? [],
    threads: partial.threads ?? [],
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
});
