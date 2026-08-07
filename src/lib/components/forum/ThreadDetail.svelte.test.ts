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
  // eslint-disable-next-line no-unused-vars -- type-only param name
  onCitar?: (payload: { author_display_name: string; body_excerpt: string; post_id: string }) => void;
  totalPosts?: number;
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

describe('ThreadDetail header meta line', () => {
  const post: PostView = {
    id: 'p1',
    post_number: 1,
    body: {},
    author_id: 'u1',
    created_at: '2026-08-01T00:00:00Z',
    edited_at: null,
    edited_by: null,
    author: null,
    reply_to_post_id: null,
    like_count: 0,
    viewer_has_liked: null,
  };

  it('renders the meta line with reply count, publish date and kicker', () => {
    render(ThreadDetail, makeProps({ totalPosts: 7 }));
    expect(screen.getByTestId('thread-meta-line')).toBeInTheDocument();
    expect(screen.getByTestId('thread-replies')).toHaveTextContent('7 respuestas');
    expect(screen.getByTestId('thread-published')).toHaveTextContent(/Publicado/);
    expect(screen.getByTestId('thread-kicker')).toHaveTextContent('Debate');
  });

  it('uses the singular label for one reply', () => {
    render(ThreadDetail, makeProps({ totalPosts: 1, posts: [] }));
    expect(screen.getByTestId('thread-replies')).toHaveTextContent('1 respuesta');
  });

  it('falls back to the rendered posts count when totalPosts is absent', () => {
    render(ThreadDetail, makeProps({ posts: [post] }));
    expect(screen.getByTestId('thread-replies')).toHaveTextContent('1 respuesta');
  });
});

describe('ThreadDetail OP (first post) action bar', () => {
  it('renders the OP with the same reply action bar: Citar, Gracias chip and Reportar', () => {
    render(ThreadDetail, makeProps({ threadBody: '<p>apertura del hilo</p>' }));
    expect(screen.getByRole('button', { name: /Citar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reportar/i })).toBeInTheDocument();
    // OP is not a replies row: the Gracias chip renders read-only (guests' neutral state)
    expect(screen.getByText(/Gracias/i)).toBeInTheDocument();
  });

  it('forwards a Citar click on the OP into the reply-quote prefill flow', async () => {
    const user = userEvent.setup();
    const onCitar = vi.fn();
    render(ThreadDetail, makeProps({ threadBody: '<p>apertura</p>', onCitar }));
    await user.click(screen.getByRole('button', { name: /Citar/i }));
    expect(onCitar).toHaveBeenCalledTimes(1);
    const payload = onCitar.mock.calls[0][0] as { author_display_name: string; body_excerpt: string; post_id: string };
    expect(payload.author_display_name).toBe('Autor');
    expect(payload.body_excerpt).toContain('apertura');
    expect(payload.post_id).toBe('t1'); // the OP is identified by the thread id
  });

  it('shows a Compartir action on the OP too', () => {
    render(ThreadDetail, makeProps({ threadBody: '<p>apertura</p>' }));
    expect(screen.getByRole('button', { name: /Compartir/i })).toBeInTheDocument();
  });
});

describe('ThreadDetail lock banner + staff controls', () => {
  it('shows a prominent lock banner with a Reabrir hilo button for staff on a locked thread', () => {
    render(ThreadDetail, makeProps({ isLocked: true, isStaff: true }));
    expect(screen.getByTestId('lock-banner')).toHaveTextContent(/Este hilo está bloqueado/);
    expect(screen.getByRole('button', { name: /Reabrir hilo/i })).toBeInTheDocument();
  });

  it('shows the lock banner to everyone but only staff can reopen', () => {
    render(ThreadDetail, makeProps({ isLocked: true, isStaff: false }));
    expect(screen.getByTestId('lock-banner')).toHaveTextContent(/Este hilo está bloqueado/);
    expect(screen.queryByRole('button', { name: /Reabrir hilo/i })).not.toBeInTheDocument();
  });

  it('offers a subtle Bloquear hilo action to staff on an open thread', () => {
    render(ThreadDetail, makeProps({ isLocked: false, isStaff: true }));
    expect(screen.getByRole('button', { name: /Bloquear hilo/i })).toBeInTheDocument();
  });

  it('does not offer Bloquear hilo to non-staff on an open thread', () => {
    render(ThreadDetail, makeProps({ isLocked: false, isStaff: false }));
    expect(screen.queryByRole('button', { name: /Bloquear hilo/i })).not.toBeInTheDocument();
  });

  it('does not show the lock banner on an open thread', () => {
    render(ThreadDetail, makeProps({ isLocked: false, isStaff: false }));
    expect(screen.queryByText(/Este hilo está bloqueado/i)).not.toBeInTheDocument();
  });
});

describe('ThreadDetail reply-to chip resolution (replyToAuthor)', () => {
  const replyPost: PostView = {
    id: 'p2',
    post_number: 2,
    body: {},
    author_id: 'u1',
    created_at: '2026-08-01T00:00:00Z',
    edited_at: null,
    edited_by: null,
    author: { id: 'u1', display_name: 'Autor', username: 'autor' },
    reply_to_post_id: 'p1',
    replyTo: { id: 'p1', author: { id: 'u9', display_name: 'Legolas', username: 'legolas' } },
    like_count: 0,
    viewer_has_liked: null,
  };

  it('renders "Respondiendo a <author>" when post.replyTo resolves to an author', () => {
    render(ThreadDetail, makeProps({ posts: [replyPost] }));
    expect(screen.getByText(/Respondiendo a/)).toBeInTheDocument();
    // the author name is its own span inside the chip; unique in this render
    expect(screen.getByText('Legolas')).toBeInTheDocument();
  });

  it('prefers display_name over username for the reply-to chip', () => {
    const mixed = {
      ...replyPost,
      replyTo: { id: 'p1', author: { id: 'u9', display_name: null, username: 'legolas' } },
    };
    render(ThreadDetail, makeProps({ posts: [mixed] }));
    expect(screen.getByText(/Respondiendo a/)).toBeInTheDocument();
    expect(screen.getByText('legolas')).toBeInTheDocument();
  });

  it('renders no reply-to chip when replyTo has no author (absent/deleted target)', () => {
    const orphan = { ...replyPost, reply_to_post_id: 'pX', replyTo: { id: 'pX', author: null } };
    render(ThreadDetail, makeProps({ posts: [orphan] }));
    expect(screen.queryByText(/Respondiendo a/)).not.toBeInTheDocument();
  });

  it('renders no reply-to chip when a post has no replyTo at all', () => {
    const plain: PostView = {
      id: 'p3',
      post_number: 3,
      body: {},
      author_id: 'u1',
      created_at: '2026-08-01T00:00:00Z',
      edited_at: null,
      edited_by: null,
      author: null,
      reply_to_post_id: null,
      like_count: 0,
      viewer_has_liked: null,
    };
    render(ThreadDetail, makeProps({ posts: [plain] }));
    expect(screen.queryByText(/Respondiendo a/)).not.toBeInTheDocument();
  });
});
