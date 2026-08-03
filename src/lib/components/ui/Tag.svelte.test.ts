import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Tag from './Tag.svelte';

const children = createRawSnippet(() => ({ render: () => 'Sexto Reino' }));

describe('Tag', () => {
  it('renders children with the default tag styling', () => {
    render(Tag, { children });
    const tag = document.querySelector('span');
    expect(tag?.textContent).toContain('Sexto Reino');
    expect(tag).toHaveClass('bg-azeroth-sunken');
  });

  it('applies the gold and blue variants', () => {
    const { unmount } = render(Tag, { variant: 'gold', children });
    expect(document.querySelector('span')).toHaveClass('text-azeroth-gold-soft');
    unmount();

    render(Tag, { variant: 'blue', children });
    expect(document.querySelector('span')).toHaveClass('text-[#8FC7EC]');
  });
});
