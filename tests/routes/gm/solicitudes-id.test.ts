import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../../../src/routes/gm/solicitudes/[id]/+page.svelte';

describe('gm/solicitudes/[id] (REQ-GS-02)', () => {
  it('wraps the reject-notes input in a Field, keeping the input full-width', () => {
    render(Page, {
      data: {
        request: {
          id: 'r1',
          total_xp_cost: 10,
          justification: 'Quiero mejorar Espadas',
          character: { name: 'Aragorn', player: { display_name: 'Pablo' } },
          items: [
            {
              id: 'i1',
              skill: { name: 'Espadas' },
              specialization: null,
              from_level: 1,
              to_level: 2,
              xp_cost: 10,
            },
          ],
        },
      } as never,
      form: null as never,
    });

    const fieldset = document.querySelector('fieldset');
    expect(fieldset).toBeInTheDocument();
    const legend = fieldset?.querySelector('legend');
    expect(legend?.textContent).toContain('Motivo del rechazo');

    const input = document.querySelector('input[name="notes"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex-1');
    expect(input.className).not.toContain('w-40');
  });
});
