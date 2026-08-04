import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TipTapViewer from './TipTapViewer.svelte';

describe('Spoiler a11y + viewer wiring (REQ-SPOIL-01.3 / 01.2, REQ-SPOIL normal text)', () => {
  it('renders the spoiler span focusable so keyboard users reveal it', () => {
    const { container } = render(TipTapViewer, {
      content: '<p>Antes <span data-type="spoiler">secreto</span> Despues</p>',
    });
    const span = container.querySelector('[data-type="spoiler"]') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.tagName).toBe('SPAN');
    expect(span.getAttribute('tabindex')).toBe('0');
    expect(span.classList.contains('spoiler')).toBe(true);
    expect(span.textContent).toContain('secreto');
  });

  it('becomes the active element on focus, triggering :focus-visible reveal', () => {
    const { container } = render(TipTapViewer, {
      content: '<p><span data-type="spoiler">secreto</span></p>',
    });
    const span = container.querySelector('[data-type="spoiler"]') as HTMLElement;
    span.focus();
    expect(document.activeElement).toBe(span);
  });

  it('renders a normal post unchanged with no spoiler wrapper', () => {
    const { container } = render(TipTapViewer, {
      content: '<p>Hola mundo</p>',
    });
    expect(container.querySelector('.spoiler')).toBeNull();
    expect(container.querySelector('[data-type="spoiler"]')).toBeNull();
    expect(container.textContent).toContain('Hola mundo');
  });
});
