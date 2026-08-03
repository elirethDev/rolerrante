import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PostCard from './PostCard.svelte';

// Capture the use:enhance callback so tests can drive submit + result phases.
type EnhanceOpts = {
  formData: FormData;
  form: HTMLFormElement;
  cancel: () => void;
  submitter?: HTMLButtonElement | null;
};
type ResultHandler = (opts: {
  result: { type: string; status: number; data?: { message?: string } };
  update: () => Promise<void>;
}) => Promise<void>;

let enhanceHandler: ((opts: EnhanceOpts) => ResultHandler | Promise<ResultHandler>) | undefined;

vi.mock('$app/forms', () => ({
  enhance: (_node: Element, cb: (opts: EnhanceOpts) => ResultHandler | Promise<ResultHandler>) => {
    enhanceHandler = cb;
    return {};
  },
}));

beforeEach(() => {
  enhanceHandler = undefined;
});

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
  like_count: 0,
  viewer_has_liked: false,
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

describe('PostCard reactions (REQ-REACT-01.3 / REQ-02.3)', () => {
  it('renders the "N Gracias" count chip for a post with likes', () => {
    render(PostCard, { post: post({ like_count: 3, viewer_has_liked: true }) });
    const chip = screen.getByTestId('like-chip');
    expect(chip).toHaveTextContent('3 Gracias');
    expect(chip).toBeInTheDocument();
  });

  it('hides the toggle button for guests but still shows the count (REQ-02.3)', () => {
    render(PostCard, { post: post({ like_count: 5, viewer_has_liked: null }) });
    expect(screen.getByTestId('like-chip')).toHaveTextContent('5 Gracias');
    expect(screen.queryByTestId('like-toggle')).not.toBeInTheDocument();
  });

  it('marks the toggle as active (aria-pressed) when the viewer already liked', () => {
    render(PostCard, { post: post({ like_count: 2, viewer_has_liked: true }) });
    expect(screen.getByTestId('like-toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  it('optimistically increments the count on submit before the server responds', async () => {
    render(PostCard, { post: post({ like_count: 3, viewer_has_liked: false }) });
    expect(screen.getByTestId('like-chip')).toHaveTextContent('3 Gracias');

    // drive the use:enhance submit phase (optimistic update happens here)
    const resultHandler = await enhanceHandler!({
      formData: new FormData(),
      form: document.createElement('form'),
      cancel: () => {},
    });

    expect(screen.getByTestId('like-chip')).toHaveTextContent('4 Gracias');
    expect(screen.getByTestId('like-toggle')).toHaveAttribute('aria-pressed', 'true');

    // server success (redirect) keeps the optimistic state
    await resultHandler({ result: { type: 'redirect', status: 303 }, update: async () => {} });
    expect(screen.getByTestId('like-chip')).toHaveTextContent('4 Gracias');
  });

  it('optimistically decrements on unlike and rolls back to the server count on failure', async () => {
    render(PostCard, { post: post({ like_count: 3, viewer_has_liked: true }) });
    expect(screen.getByTestId('like-chip')).toHaveTextContent('3 Gracias');

    const resultHandler = await enhanceHandler!({
      formData: new FormData(),
      form: document.createElement('form'),
      cancel: () => {},
    });

    // optimistic unlike: 3 -> 2, toggle inactive
    expect(screen.getByTestId('like-chip')).toHaveTextContent('2 Gracias');
    expect(screen.getByTestId('like-toggle')).toHaveAttribute('aria-pressed', 'false');

    // server failure (e.g. permission denied) -> rollback to original count
    await resultHandler({
      result: { type: 'failure', status: 403, data: { message: 'No puedes' } },
      update: async () => {},
    });
    expect(screen.getByTestId('like-chip')).toHaveTextContent('3 Gracias');
    expect(screen.getByTestId('like-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('like-error')).toHaveTextContent('No puedes');
  });

  it('posts the post_id to the like form action', () => {
    render(PostCard, { post: post({ like_count: 1, viewer_has_liked: false }) });
    const form = document.querySelector('form[method="POST"][action="?/like"]');
    expect(form).not.toBeNull();
    const hidden = form?.querySelector('input[name="post_id"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe('p1');
  });
});
