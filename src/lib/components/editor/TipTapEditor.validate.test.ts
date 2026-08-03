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
  const toolbar = container.querySelector('.bg-base-200');
  if (!toolbar) throw new Error('Toolbar not found');
  const buttons = toolbar.querySelectorAll('button');
  return buttons[index] as HTMLButtonElement;
}

describe('TipTapEditor image insert validation (REQ-FORUM-03.5)', () => {
  it('rejects a javascript: image url when a validateImageUrl prop is provided', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const validateImageUrl = vi.fn((url: string) => /^https?:\/\//.test(url));
    const { container } = render(TipTapEditor, { content: '', onChange, validateImageUrl });
    const editorEl = getEditorEl(container);
    editorEl.focus();

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('javascript:alert(1)');
    const imageBtn = findToolbarButton(container, 9); // Image is last toolbar button (index 12)
    await user.click(imageBtn);

    expect(validateImageUrl).toHaveBeenCalledWith('javascript:alert(1)');
    // bad url -> no <img> inserted
    const calls = onChange.mock.calls.flat().join('');
    expect(calls).not.toContain('<img');
    promptSpy.mockRestore();
  });

  it('accepts an https: image url and inserts an img when validated', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const validateImageUrl = vi.fn((url: string) => /^https?:\/\//.test(url));
    const { container } = render(TipTapEditor, { content: '', onChange, validateImageUrl });
    const editorEl = getEditorEl(container);
    editorEl.focus();

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/a.png');
    const imageBtn = findToolbarButton(container, 9);
    await user.click(imageBtn);

    const calls = onChange.mock.calls.flat().join('');
    expect(calls).toContain('<img');
    promptSpy.mockRestore();
  });
});

