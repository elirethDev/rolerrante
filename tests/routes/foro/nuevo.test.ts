import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Page from '../../../src/routes/foro/nuevo/+page.svelte';

function getEditorEl(container: HTMLElement): HTMLElement {
  const el = container.querySelector('.ProseMirror') as HTMLElement;
  if (!el) throw new Error('ProseMirror element not found');
  return el;
}

const categories = [{ id: 'c1', name: 'General', parent_id: null }];

function renderPage() {
  return render(Page, {
    data: { categories } as never,
    form: null as never,
  });
}

describe('foro/nuevo autosave (REQ-FC-05)', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('restores a saved new-thread draft (content + title) on mount', () => {
    window.localStorage.setItem(
      'forum:draft:nuevo',
      JSON.stringify({ content: '<p>borrador hilo</p>', title: 'Titulo borrador', timestamp: 1 }),
    );
    const { container } = renderPage();
    const el = getEditorEl(container);
    const titleInput = container.querySelector('input[name="title"]') as HTMLInputElement;
    expect(el.textContent).toContain('borrador hilo');
    expect(titleInput.value).toBe('Titulo borrador');
    expect(screen.getByTestId('draft-indicator')).toHaveTextContent('Borrador guardado');
  });

  it('saves content + title to forum:draft:nuevo as you type', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const titleInput = container.querySelector('input[name="title"]') as HTMLInputElement;
    const el = getEditorEl(container);
    el.focus();
    await user.type(el, 'hola');
    await user.type(titleInput, 'Mi titulo');
    await waitFor(
      () => {
        const raw = window.localStorage.getItem('forum:draft:nuevo');
        expect(raw).not.toBeNull();
        if (raw) {
          const draft = JSON.parse(raw);
          expect(draft.content).toContain('hola');
          expect(draft.title).toBe('Mi titulo');
        }
      },
      { timeout: 600 },
    );
  });
});
