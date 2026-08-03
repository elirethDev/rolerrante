import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TipTapViewer from './TipTapViewer.svelte';

describe('TipTapViewer link + underline render (REQ-FC-03)', () => {
  it('renders an anchor from known TipTap link HTML', () => {
    const { container } = render(TipTapViewer, {
      content: '<p><a href="https://example.com" rel="noopener nofollow">link</a></p>',
    });
    const a = container.querySelector('a[href="https://example.com"]');
    expect(a).not.toBeNull();
    expect(a!.textContent).toBe('link');
  });

  it('renders an underline mark from known TipTap underline HTML', () => {
    const { container } = render(TipTapViewer, {
      content: '<p><u>subrayado</u></p>',
    });
    const u = container.querySelector('u');
    expect(u).not.toBeNull();
    expect(u!.textContent).toBe('subrayado');
  });

  it('renders both link and underline together in a known doc', () => {
    const { container } = render(TipTapViewer, {
      content: '<p><u><a href="https://x.io">nx</a></u></p>',
    });
    const a = container.querySelector('a[href="https://x.io"]');
    const u = container.querySelector('u');
    expect(a).not.toBeNull();
    expect(u).not.toBeNull();
    expect(u!.textContent).toBe('nx');
  });
});
