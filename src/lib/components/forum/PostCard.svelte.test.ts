import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

  it('emits a Citar payload with plain-text excerpt truncated to 500 (REQ-FC-04/02.5)', async () => {
    const user = userEvent.setup();
    const onCitar = vi.fn();
    const longBody = '<p>' + 'Palabra '.repeat(150) + '</p>'; // > 500 chars
    render(PostCard, { post: post({ body: longBody }), onCitar });
    await user.click(screen.getByRole('button', { name: 'Citar' }));
    expect(onCitar).toHaveBeenCalledTimes(1);
    const payload = onCitar.mock.calls[0][0] as {
      author_display_name: string;
      body_excerpt: string;
      post_id: string;
    };
    expect(payload.author_display_name).toBe('Aragorn');
    expect(payload.post_id).toBe('p1');
    expect(payload.body_excerpt.length).toBeLessThanOrEqual(500);
    expect(payload.body_excerpt).not.toContain('<');
  });

  it('emits a Citar payload with short plain body unchanged', async () => {
    const user = userEvent.setup();
    const onCitar = vi.fn();
    render(PostCard, { post: post({ body: '<p>Texto corto</p>' }), onCitar });
    await user.click(screen.getByRole('button', { name: 'Citar' }));
    expect(onCitar).toHaveBeenCalledTimes(1);
    const payload = onCitar.mock.calls[0][0] as { body_excerpt: string };
    expect(payload.body_excerpt).toBe('Texto corto');
  });
});
