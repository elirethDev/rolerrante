import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Badge from './Badge.svelte';

const children = createRawSnippet(() => ({ render: () => 'Fijado' }));

describe('Badge', () => {
  it('applies the variant styling per variant', () => {
    const { unmount } = render(Badge, { children });
    expect(document.querySelector('span')).toHaveClass('text-azeroth-gold-bright');
    unmount();

    render(Badge, { variant: 'danger', children });
    expect(document.querySelector('span')).toHaveClass('text-azeroth-danger-fg');
  });

  it('shows a status dot by default', () => {
    render(Badge, { children });
    expect(document.querySelector('span[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('hides the dot when no-dot is requested', () => {
    render(Badge, { dot: false, children });
    expect(document.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument();
  });
});
