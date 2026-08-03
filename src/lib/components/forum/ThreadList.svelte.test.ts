import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ThreadList from './ThreadList.svelte';

const thread = (p: Partial<Record<string, unknown>> = {}) => ({
  id: 't1',
  title: 'Mi hilo',
  content_type: 'debate',
  status: 'abierto',
  is_locked: false,
  created_at: '2026-08-02T00:00:00Z',
  edited_at: null,
  category_id: 'c1',
  posts_count: 0,
  lastPost: null,
  ...p,
});

describe('ThreadList', () => {
  it('renders thread titles and author info', () => {
    render(ThreadList, { threads: [thread()] });
    expect(screen.getByText('Mi hilo')).toBeInTheDocument();
  });

  it('shows a lock badge on locked threads', () => {
    render(ThreadList, { threads: [thread({ is_locked: true })] });
    expect(screen.getByTestId('lock-badge')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
  });

  it('does not show lock badge on unlocked threads', () => {
    render(ThreadList, { threads: [thread({ is_locked: false })] });
    expect(screen.queryByTestId('lock-badge')).not.toBeInTheDocument();
  });

  it('shows posts_count and the last author per row (REQ-FORUM-02.2)', () => {
    render(ThreadList, {
      threads: [
        thread({
          posts_count: 5,
          lastPost: { author_display_name: 'Nyx', avatar_url: null },
        }),
      ],
    });
    expect(screen.getByText('5 mensajes')).toBeInTheDocument();
    expect(screen.getByText('Nyx')).toBeInTheDocument();
  });

  it('defaults to 0 messages and no last author when posts metadata is absent', () => {
    render(ThreadList, { threads: [thread({ posts_count: undefined })] });
    expect(screen.getByText('0 mensajes')).toBeInTheDocument();
    expect(screen.queryByText(/Último:/)).not.toBeInTheDocument();
  });
});
