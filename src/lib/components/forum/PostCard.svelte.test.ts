import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('emits a Citar payload with plain-text excerpt truncated to 500 (REQ-FC-04/02.5)', async () => {
    const user = userEvent.setup();
    const onCitar = vi.fn();
    const longBody = '<p>' + 'Palabra '.repeat(150) + '</p>'; // > 500 chars
    render(PostCard, props({ post: post({ body: longBody }), onCitar }));
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
    render(PostCard, props({ post: post({ body: '<p>Texto corto</p>' }), onCitar }));
    await user.click(screen.getByRole('button', { name: 'Citar' }));
    expect(onCitar).toHaveBeenCalledTimes(1);
    const payload = onCitar.mock.calls[0][0] as { body_excerpt: string };
    expect(payload.body_excerpt).toBe('Texto corto');
  });
});

describe('PostCard reactions (REQ-REACT-01.3 / REQ-02.3)', () => {
  it('renders the "N Gracias" count chip for a post with likes', () => {
    render(PostCard, props({ post: post({ like_count: 3, viewer_has_liked: true }) }));
    const chip = screen.getByTestId('like-chip');
    expect(chip).toHaveTextContent('3 Gracias');
    expect(chip).toBeInTheDocument();
  });

  it('hides the toggle button for guests but still shows the count (REQ-02.3)', () => {
    render(PostCard, props({ post: post({ like_count: 5, viewer_has_liked: null }) }));
    expect(screen.getByTestId('like-chip')).toHaveTextContent('5 Gracias');
    expect(screen.queryByTestId('like-toggle')).not.toBeInTheDocument();
  });

  it('marks the toggle as active (aria-pressed) when the viewer already liked', () => {
    render(PostCard, props({ post: post({ like_count: 2, viewer_has_liked: true }) }));
    expect(screen.getByTestId('like-toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  it('optimistically increments the count on submit before the server responds', async () => {
    render(PostCard, props({ post: post({ like_count: 3, viewer_has_liked: false }) }));
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
    render(PostCard, props({ post: post({ like_count: 3, viewer_has_liked: true }) }));
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
    render(PostCard, props({ post: post({ like_count: 1, viewer_has_liked: false }) }));
    const form = document.querySelector('form[method="POST"][action="?/like"]');
    expect(form).not.toBeNull();
    const hidden = form?.querySelector('input[name="post_id"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe('p1');
  });
});

describe('PostCard Reportar', () => {
  it('renders a Reportar button on every post', () => {
    render(PostCard, props());
    expect(screen.getByRole('button', { name: /Reportar/i })).toBeInTheDocument();
  });

  it('opens the ReportModal when Reportar is clicked (REP-01.1)', async () => {
    const user = userEvent.setup();
    render(PostCard, props());
    await user.click(screen.getByRole('button', { name: /Reportar/i }));

    // The modal posts to ?/report with this post's id (REP-01.1).
    const form = screen.getByTestId('report-form');
    expect(form).toHaveAttribute('action', '?/report');
    expect(form.querySelector('input[name="post_id"]')).toHaveValue('p1');
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
