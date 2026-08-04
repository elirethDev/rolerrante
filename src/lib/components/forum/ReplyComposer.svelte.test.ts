import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReplyComposer from './ReplyComposer.svelte';

function getEditorEl(container: HTMLElement): HTMLElement {
  const el = container.querySelector('.ProseMirror') as HTMLElement;
  if (!el) throw new Error('ProseMirror element not found');
  return el;
}

const counter = () => screen.getByTestId('char-counter');

describe('ReplyComposer', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders a submit button with the default label', () => {
    render(ReplyComposer);
    expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
  });

  it('renders a custom submit label', () => {
    render(ReplyComposer, { submitLabel: 'Crear debate' });
    expect(screen.getByRole('button', { name: 'Crear debate' })).toBeInTheDocument();
  });

  it('posts to the given action (reply) via form method', () => {
    render(ReplyComposer, { action: '?/reply' });
    const form = document.querySelector('form');
    expect(form).toHaveAttribute('method', 'POST');
    expect(form).toHaveAttribute('action', '?/reply');
  });

  it('shows 0/8192 counter by default', () => {
    render(ReplyComposer);
    expect(counter().textContent).toContain('0/8192');
  });

  it('updates the counter live as content grows (REQ-FC-01)', async () => {
    const user = userEvent.setup();
    const { container } = render(ReplyComposer);
    const el = getEditorEl(container);
    el.focus();
    await user.type(el, 'hola');
    expect(counter().textContent).toContain('4/8192');
  });

  it('soft-blocks submit and warns past maxLength (REQ-FC-01)', async () => {
    const user = userEvent.setup();
    const { container } = render(ReplyComposer, { maxLength: 7 });
    const el = getEditorEl(container);
    el.focus();
    await user.type(el, 'abcdefgh');
    expect(screen.getByRole('button', { name: 'Responder' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/superado/);
    expect(counter().textContent).toContain('8/7');
  });

  describe('autosave (REQ-FC-02)', () => {
    it('debounce-saves the draft and shows the indicator', async () => {
      const user = userEvent.setup();
      const { container } = render(ReplyComposer, {
        draftKey: 'forum:draft:t1',
        autosaveMs: 10,
      });
      const el = getEditorEl(container);
      el.focus();
      await user.type(el, 'hola');
      await waitFor(
        () => {
          const raw = window.localStorage.getItem('forum:draft:t1');
          expect(raw).not.toBeNull();
          if (raw) expect(JSON.parse(raw).content).toContain('hola');
        },
        { timeout: 600 },
      );
      expect(screen.getByTestId('draft-indicator')).toHaveTextContent('Borrador guardado');
    });

    it('restores a saved draft on mount with indicator', () => {
      window.localStorage.setItem(
        'forum:draft:t2',
        JSON.stringify({ content: '<p>borrador</p>', title: undefined, timestamp: 1 }),
      );
      const { container } = render(ReplyComposer, { draftKey: 'forum:draft:t2' });
      const el = getEditorEl(container);
      expect(el.textContent).toContain('borrador');
      expect(screen.getByTestId('draft-indicator')).toHaveTextContent('Borrador guardado');
    });
  });

  describe('quote prefill (REQ-FC-04)', () => {
    it('renders pill + blockquote prefill + hidden inputs from quotePayload', () => {
      const { container } = render(ReplyComposer, {
        quotePayload: {
          author_display_name: 'Aragorn',
          body_excerpt: 'Cita citada',
          post_id: 'p1',
        },
      });
      expect(screen.getByText('Aragorn')).toBeInTheDocument();
      const el = getEditorEl(container);
      expect(el.textContent).toContain('Cita citada');
      expect(el.textContent).toContain('Aragorn');
      expect(document.querySelector('input[name="quote_author"]')).toHaveValue('Aragorn');
      expect(document.querySelector('input[name="quote_excerpt"]')).toHaveValue('Cita citada');
      expect(document.querySelector('input[name="quote_post_id"]')).toHaveValue('p1');
    });

    it('shows no pill and no quote inputs without quotePayload', () => {
      render(ReplyComposer);
      expect(screen.queryByText(/Respondiendo a/)).not.toBeInTheDocument();
      expect(document.querySelector('input[name="quote_author"]')).toBeNull();
      expect(document.querySelector('input[name="quote_post_id"]')).toBeNull();
    });

    it('prefills the editor when a quote arrives after mount (Citar flow, REQ-FC-04)', async () => {
      const { container, rerender } = render(ReplyComposer);
      const el = getEditorEl(container);
      expect(el.textContent).not.toContain('La nave será nuestra');

      await rerender({
        quotePayload: {
          author_display_name: 'Legolas',
          body_excerpt: 'La nave será nuestra',
          post_id: 'p2',
        },
      });

      await waitFor(() => {
        expect(el.textContent).toContain('La nave será nuestra');
        expect(el.textContent).toContain('Legolas');
      });
      expect(document.querySelector('input[name="quote_author"]')).toHaveValue('Legolas');
      expect(document.querySelector('input[name="quote_excerpt"]')).toHaveValue(
        'La nave será nuestra',
      );
      expect(document.querySelector('input[name="quote_post_id"]')).toHaveValue('p2');
    });

    it('does not overwrite already-typed content when a quote arrives (REQ-FC-04)', async () => {
      const user = userEvent.setup();
      const { container, rerender } = render(ReplyComposer);
      const el = getEditorEl(container);
      el.focus();
      await user.type(el, 'mi respuesta');

      await rerender({
        quotePayload: {
          author_display_name: 'Galadriel',
          body_excerpt: 'Incluso la más pequeña',
          post_id: 'p5',
        },
      });

      expect(el.textContent).toContain('mi respuesta');
      expect(el.textContent).not.toContain('Incluso la más pequeña');
    });

    it('removes the quoted blockquote from the editor on clear (REQ-FC-04)', async () => {
      const user = userEvent.setup();
      const onClearQuote = vi.fn();
      const { container, rerender } = render(ReplyComposer, { onClearQuote });

      await rerender({
        onClearQuote,
        quotePayload: {
          author_display_name: 'Gimli',
          body_excerpt: 'Piedra y metal',
          post_id: 'p3',
        },
      });

      const el = getEditorEl(container);
      await waitFor(() => expect(el.textContent).toContain('Piedra y metal'));

      await user.click(screen.getByRole('button', { name: 'Cancelar cita' }));

      expect(onClearQuote).toHaveBeenCalledTimes(1);
      expect(el.textContent).not.toContain('Piedra y metal');
    });

    it('restores a saved draft over a quote at mount (REQ-FC-04/02)', () => {
      window.localStorage.setItem(
        'forum:draft:t3',
        JSON.stringify({ content: '<p>borrador gana</p>', title: undefined, timestamp: 1 }),
      );
      const { container } = render(ReplyComposer, {
        draftKey: 'forum:draft:t3',
        quotePayload: {
          author_display_name: 'Boromir',
          body_excerpt: 'Uno no puede simplemente',
          post_id: 'p4',
        },
      });
      const el = getEditorEl(container);
      expect(el.textContent).toContain('borrador gana');
      expect(el.textContent).not.toContain('Uno no puede simplemente');
    });
  });
});
