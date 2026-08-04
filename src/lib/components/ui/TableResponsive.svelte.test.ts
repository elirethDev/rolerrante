import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TableResponsiveHarness from './TableResponsiveHarness.svelte';

describe('TableResponsive', () => {
  it('renders the header row from the columns prop with scope=col', () => {
    render(TableResponsiveHarness);
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Acción', 'Responsable', 'Destino']);
    headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'));
  });

  it('renders body cells carrying data-th labels for mobile stacking', () => {
    render(TableResponsiveHarness);
    const rows = screen.getAllByRole('row');
    const bodyRow = rows[1];
    expect(bodyRow.querySelectorAll('td')).toHaveLength(3);
    bodyRow.querySelectorAll('td').forEach((td, i) => {
      expect(td).toHaveAttribute(
        'data-th',
        ['Acción', 'Responsable', 'Destino'][i],
      );
    });
  });

  it('wraps the table in the responsive azeroth-table container', () => {
    render(TableResponsiveHarness);
    const table = document.querySelector('table');
    expect(table).toHaveClass('azeroth-table');
    expect(table?.closest('div')?.className).toContain('shadow-[var(--shadow-1)]');
  });
});
