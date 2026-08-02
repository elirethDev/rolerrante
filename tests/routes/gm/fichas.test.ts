import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../../../src/routes/gm/fichas/+page.svelte';

describe('gm/fichas (REQ-GS-02)', () => {
  it('renders the reject-motivo input full-width without w-40', () => {
    render(Page, {
      data: {
        characters: [
          {
            id: 'c1',
            name: 'Aragorn',
            race: { name: 'Humano' },
            player: { display_name: 'Pablo', username: 'pablo' },
          },
        ],
      } as never,
      form: null as never,
    });

    const input = document.querySelector('input[name="notes"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex-1');
    expect(input.className).not.toContain('w-40');
    expect(document.querySelector('[class*="w-40"]')).toBeNull();
  });
});
