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

describe('TipTapEditor', () => {
  it('mounts editable and renders initial content', () => {
    const onChange = vi.fn();
    const { container } = render(TipTapEditor, {
      content: '<p>Hello</p>',
      onChange,
    });
    const editorEl = getEditorEl(container);
    expect(editorEl).not.toBeNull();
    expect(editorEl.textContent).toContain('Hello');
    // tiptap builds initial doc via EditorState.create with NO dispatched
    // transaction — onUpdate/onChange does NOT fire at mount.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports typing text and fires onChange with HTML', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(TipTapEditor, {
      content: '',
      onChange,
    });

    const editorEl = getEditorEl(container);
    editorEl.focus();
    await user.type(editorEl, 'Hello World');

    expect(onChange).toHaveBeenCalled();
    const calls = onChange.mock.calls.flat();
    const html = calls.join('');
    expect(html).toContain('Hello World');
  });

  it('toolbar bold toggle produces strong tag in onChange output', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(TipTapEditor, {
      content: '',
      onChange,
    });

    const editorEl = getEditorEl(container);
    editorEl.focus();

    // Bold is first toolbar button (index 0)
    const boldBtn = findToolbarButton(container, 0);
    await user.click(boldBtn);

    // Type with bold mark active
    await user.type(editorEl, 'bold text');

    const calls = onChange.mock.calls.flat();
    const html = calls.join('');
    expect(html).toContain('<strong>');
  });

  it('setContent via prop updates DOM without triggering onChange', async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(TipTapEditor, {
      content: '<p>original</p>',
      onChange,
    });

    // no onChange on mount (see test 1) — spy is clean by default

    // Simulate parent passing new content prop
    await rerender({ content: '<p>updated</p>' });

    const editorEl = getEditorEl(container);
    expect(editorEl.textContent).toContain('updated');

    // setContent uses { emitUpdate: false } — onChange must NOT fire
    expect(onChange).not.toHaveBeenCalled();
  });
});
