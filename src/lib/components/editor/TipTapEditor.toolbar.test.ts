import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TipTapEditor from './TipTapEditor.svelte';

function getEditorEl(container: HTMLElement): HTMLElement {
  const el = container.querySelector('.ProseMirror') as HTMLElement;
  if (!el) throw new Error('ProseMirror element not found');
  return el;
}

function findToolbarButton(container: HTMLElement, index: number): HTMLButtonElement {
  const toolbar = container.querySelector('.composer-toolbar');
  if (!toolbar) throw new Error('Toolbar not found');
  const buttons = toolbar.querySelectorAll('button');
  return buttons[index] as HTMLButtonElement;
}

async function selectAllText(editorEl: HTMLElement) {
  const sel = document.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editorEl);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('TipTapEditor toolbar extensions (REQ-FC-05)', () => {
  it('underlines selected text via underline toggle', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(TipTapEditor, { content: '', onChange });
    const editorEl = getEditorEl(container);
    editorEl.focus();
    await user.type(editorEl, 'sub');
    await selectAllText(editorEl);
    // Underline is toolbar button index 2
    await user.click(findToolbarButton(container, 2));
    const html = onChange.mock.calls.flat().join('');
    expect(html).toContain('<u>');
  });

  it('inserts a link from prompt and client-guards protocol', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(TipTapEditor, { content: '', onChange });
    const editorEl = getEditorEl(container);
    editorEl.focus();
    await user.type(editorEl, 'link text');
    await selectAllText(editorEl);

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/path');
    const linkBtn = findToolbarButton(container, 10); // first new button after image (index 9)
    await user.click(linkBtn);

    const html = onChange.mock.calls.flat().join('');
    expect(html).toContain('href="https://example.com/path"');
    promptSpy.mockRestore();
  });

  it('does not insert a javascript: link (client guard)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(TipTapEditor, { content: '', onChange });
    const editorEl = getEditorEl(container);
    editorEl.focus();
    await user.type(editorEl, 'link text');
    await selectAllText(editorEl);

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('javascript:alert(1)');
    await user.click(findToolbarButton(container, 10));

    const html = onChange.mock.calls.flat().join('');
    expect(html).not.toContain('href="javascript:');
    promptSpy.mockRestore();
  });

  it('exposes charCount via callback as typing progresses', async () => {
    const user = userEvent.setup();
    const onCharCount = vi.fn();
    const { container } = render(TipTapEditor, {
      content: '',
      onChange: () => {},
      onCharCount,
    });
    const editorEl = getEditorEl(container);
    editorEl.focus();
    await user.type(editorEl, 'hello');
    expect(onCharCount).toHaveBeenCalled();
    const last = onCharCount.mock.calls.at(-1)?.[0] as number;
    expect(last).toBeGreaterThan(0);
    expect(Number.isInteger(last)).toBe(true);
  });

  it('renders the spoiler toolbar button enabled and wired (not a disabled placeholder)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(TipTapEditor, { content: '<p>hola</p>', onChange });
    const editorEl = getEditorEl(container);
    editorEl.focus();
    const spoilerBtn = findToolbarButton(container, 11); // after link (10)
    expect(spoilerBtn).not.toHaveAttribute('aria-disabled');
    expect(spoilerBtn).not.toHaveAttribute('disabled');
    expect(spoilerBtn).toHaveAttribute('title');
    // clicking the wired button does not throw (node toggling is exercised in
    // Spoiler tests; jsdom fragments multi-block selections, so we only assert
    // the button is enabled and free of errors here).
    await user.click(spoilerBtn);
  });
});
