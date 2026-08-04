import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PostView } from '$lib/forum';
import ThreadDetail from './ThreadDetail.svelte';

// TipTapViewer is heavy SSR; stub it so the detail layout renders in jsdom.
vi.mock('$lib/components/editor/TipTapViewer.svelte', () => ({
  default: () => '<div data-testid="tiptap-viewer" />',
}));

const thread = (p: Partial<Record<string, unknown>> = {}) => ({
  id: 't1',
  title: 'Mi hilo',
  status: 'abierto',
  content_type: 'debate',
  body: {},
  author_id: 'u1',
  created_at: '2026-08-02T00:00:00Z',
  edited_at: null,
  edited_by: null,
  is_locked: false,
  is_sticky: false,
  category_id: 'c1',
  linked_entity_type: null,
  linked_entity_id: null,
  author: { id: 'u1', display_name: 'Autor', username: 'autor' },
  ...p,
});

const flags = { can_view: true, can_post: true, can_edit: false, can_lock: false };

interface DetailProps {
  thread: ReturnType<typeof thread>;
  threadBody: string;
  posts: PostView[];
  entity: { name: string; status: string } | null;
  flags: typeof flags;
  isLocked: boolean;
  isSticky: boolean;
  isOwner: boolean;
  isStaff: boolean;
}

const makeProps = (p: Partial<DetailProps> = {}): DetailProps => ({
  thread: thread(),
  threadBody: '<p>cuerpo</p>',
  posts: [],
  entity: null,
  flags,
  isLocked: false,
  isSticky: false,
  isOwner: false,
  isStaff: false,
  ...p,
});

describe('ThreadDetail', () => {
  it('shows a pin badge in the header for a sticky thread', () => {
    render(ThreadDetail, makeProps({ isSticky: true }));
    expect(screen.getByTestId('pin-badge')).toBeInTheDocument();
    expect(screen.getByText('Fijado')).toBeInTheDocument();
  });

  it('does not show a pin badge for a non-sticky thread', () => {
    render(ThreadDetail, makeProps({ isSticky: false }));
    expect(screen.queryByTestId('pin-badge')).not.toBeInTheDocument();
  });

  it('shows a pin toggle for staff when the thread is not sticky', async () => {
    const user = userEvent.setup();
    render(ThreadDetail, makeProps({ isStaff: true, isSticky: false }));
    const btn = screen.getByRole('button', { name: /Fijar hilo/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
  });

  it('shows an unpin toggle for staff when the thread is sticky', () => {
    render(ThreadDetail, makeProps({ isStaff: true, isSticky: true }));
    expect(screen.getByRole('button', { name: /Desfijar hilo/i })).toBeInTheDocument();
  });

  it('does not show a pin toggle for non-staff users', () => {
    render(ThreadDetail, makeProps({ isStaff: false, isSticky: true }));
    expect(screen.queryByRole('button', { name: /fijar/i })).not.toBeInTheDocument();
  });
});
