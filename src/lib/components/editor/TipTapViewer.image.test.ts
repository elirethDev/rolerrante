import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TipTapViewer from './TipTapViewer.svelte';

describe('TipTapViewer image rendering (REQ-FORUM-03.5)', () => {
  it('renders images with max-width and lazy loading', () => {
    const { container } = render(TipTapViewer, {
      content: '<p><img src="https://example.com/x.png"></p>',
    });
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toContain('https://example.com/x.png');
    expect(img.loading).toBe('lazy');
    expect(img.style.maxWidth).toBe('100%');
  });
});
