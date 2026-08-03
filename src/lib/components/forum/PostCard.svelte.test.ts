import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PostCard from './PostCard.svelte';

const post = (p: Partial<Record<string, unknown>> = {}) => ({
  id: 'p1',
  post_number: 1,
  body: '<p>Contenido del post</p>',
  author_id: 'u1',
  created_at: '2026-08-02T00:00:00Z',
  updated_at: '2026-08-02T00:00:00Z',
  edited_at: null,
  edited_by: null,
  author: { id: 'u1', display_name: 'Aragorn', username: 'aragon' },
  ...p,
});

describe('PostCard', () => {
  it('renders post number, author and content', () => {
    render(PostCard, { post: post() });
    expect(screen.getByText('Aragorn')).toBeInTheDocument();
    expect(screen.getByText('Contenido del post')).toBeInTheDocument();
  });

  it('shows an edit marker "Editado por X" when edited_at present', () => {
    render(PostCard, {
      post: post({ edited_at: '2026-08-02T01:00:00Z', edited_by: 'u2' }),
      editorName: 'Legolas',
    });
    expect(screen.getByText(/Editado por/)).toBeInTheDocument();
    expect(screen.getByText(/Editado por Legolas/)).toBeInTheDocument();
  });

  it('does not render an edit marker when edited_at is null', () => {
    render(PostCard, { post: post() });
    expect(screen.queryByText(/Editado por/)).not.toBeInTheDocument();
  });
});
