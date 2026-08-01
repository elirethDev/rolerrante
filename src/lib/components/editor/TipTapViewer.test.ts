import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TipTapViewer from './TipTapViewer.svelte';

describe('TipTapViewer', () => {
  it('strips script tags from rendered HTML', () => {
    const { container } = render(TipTapViewer, {
      content: '<p>Safe text</p><script>alert(1)</script>',
    });
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('Safe text');
  });

  it('strips img onerror attributes from rendered HTML', () => {
    const { container } = render(TipTapViewer, {
      content: '<img src=x onerror="alert(1)" />',
    });
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
  });

  it('strips iframe tags from rendered HTML', () => {
    const { container } = render(TipTapViewer, {
      content: '<iframe src="evil"></iframe><p>ok</p>',
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('ok');
  });

  it('renders plain text content', () => {
    const { container } = render(TipTapViewer, {
      content: '<p>Hola mundo</p>',
    });
    expect(container.textContent).toContain('Hola mundo');
  });

  it('renders h1 heading correctly', () => {
    const { container } = render(TipTapViewer, {
      content: '<h1>Título</h1><p>Cuerpo</p>',
    });
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toContain('Título');
  });

  it('accepts trailing empty paragraph from TrailingNode', () => {
    const { container } = render(TipTapViewer, {
      content: '<p>Hello</p>',
    });
    // StarterKit v3 includes TrailingNode — may append <p></p>
    // Verify original content rendered; trailing <p></p> is acceptable
    expect(container.textContent).toContain('Hello');
  });
});
