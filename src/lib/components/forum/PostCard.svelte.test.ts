import { fireEvent, render, screen } from '@testing-library/svelte';
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

const props = (p: Partial<Record<string, unknown>> = {}) => ({ post: post(), threadId: 't1', ...p });

describe('PostCard', () => {
  it('renders post number, author and content', () => {
    render(PostCard, props());
    expect(screen.getByText('Aragorn')).toBeInTheDocument();
    expect(screen.getByText('Contenido del post')).toBeInTheDocument();
  });

  it('shows an edit marker "Editado por X" when edited_at present', () => {
    render(PostCard, props({ post: post({ edited_at: '2026-08-02T01:00:00Z', edited_by: 'u2' }), editorName: 'Legolas' }));
    expect(screen.getByText(/Editado por/)).toBeInTheDocument();
    expect(screen.getByText(/Editado por Legolas/)).toBeInTheDocument();
  });

  it('does not render an edit marker when edited_at is null', () => {
    render(PostCard, props());
    expect(screen.queryByText(/Editado por/)).not.toBeInTheDocument();
  });
});

describe('PostCard · Compartir', () => {
  it('copies the absolute post link to clipboard and shows feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(PostCard, props());

    await fireEvent.click(screen.getByRole('button', { name: /Compartir/ }));

    expect(await screen.findByText('¡Enlace copiado!')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/foro/t1#post-p1');
  });

  it('falls back to a temporary textarea copy when the clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    const createElement = vi.spyOn(document, 'createElement');
    render(PostCard, props());

    await fireEvent.click(screen.getByRole('button', { name: /Compartir/ }));

    expect(await screen.findByText('¡Enlace copiado!')).toBeInTheDocument();
    expect(createElement).toHaveBeenCalledWith('textarea');
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('renders the post as an anchor target #post-<id> and hides feedback before clicking', () => {
    render(PostCard, props());
    expect(document.getElementById('post-p1')).toBeInTheDocument();
    expect(screen.queryByText('¡Enlace copiado!')).not.toBeInTheDocument();
  });
});
