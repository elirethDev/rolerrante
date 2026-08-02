import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../../../src/routes/admin/logs/+page.svelte';

describe('admin/logs (REQ-AF-01)', () => {
  it('renders the filter as Field size=sm with legible legend', () => {
    render(Page, {
      data: {
        logs: [
          {
            id: 'l1',
            created_at: '2026-01-01T00:00:00Z',
            actor: { display_name: 'Pablo' },
            action: 'login',
            entity_type: 'user',
            entity_id: 'abc',
            details: {},
          },
        ],
      } as never,
    });

    const fieldset = document.querySelector('fieldset') as HTMLElement;
    expect(fieldset).toBeInTheDocument();
    expect(fieldset.className).toContain('fieldset-sm');
    expect(fieldset.querySelector('legend')?.textContent).toContain('Filtrar por acción');
    expect(fieldset.querySelector('legend')?.className).toContain('text-[13px]');
  });

  it('keeps the filter input working via Field binding passthrough', async () => {
    render(Page, {
      data: {
        logs: [
          { id: 'l1', created_at: '2026-01-01T00:00:00Z', actor: { display_name: 'Pablo' }, action: 'login', entity_type: 'user', entity_id: 'a', details: {} },
          { id: 'l2', created_at: '2026-01-02T00:00:00Z', actor: { display_name: 'Ana' }, action: 'create_skill', entity_type: 'skill', entity_id: 'b', details: {} },
        ],
      } as never,
    });

    const input = document.querySelector('input#log-filter') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    await fireEvent.input(input, { target: { value: 'login' } });
    expect(input.value).toBe('login');
    // filtered table shows only the login row
    const rows = document.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('login');
  });
});
