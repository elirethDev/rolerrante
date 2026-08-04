import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Pager from './Pager.svelte';

describe('Pager', () => {
  it('renders a pagination nav with all pages for a small total', () => {
    render(Pager, { total: 5, current: 3 });
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument();
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: `${n}` })).toBeInTheDocument();
    }
  });

  it('marks the current page with aria-current="page"', () => {
    render(Pager, { total: 5, current: 3 });
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current');
  });

  it('disables prev at the first page and next at the last page', async () => {
    const { rerender } = render(Pager, { total: 5, current: 1 });
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).not.toBeDisabled();

    await rerender({ total: 5, current: 5 });
    expect(screen.getByRole('button', { name: 'Anterior' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('calls onChange with the next page number', () => {
    const onChange = vi.fn();
    render(Pager, { total: 5, current: 2, onChange });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with the selected page number and with the previous page', () => {
    const onChange = vi.fn();
    render(Pager, { total: 5, current: 3, onChange });
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(onChange).toHaveBeenLastCalledWith(5);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('collapses a large range with ellipsis and still reaches the last page', () => {
    render(Pager, { total: 22, current: 11 });
    expect(screen.getAllByText('…')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '22' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '11' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders nothing when total is zero', () => {
    render(Pager, { total: 0, current: 1 });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
