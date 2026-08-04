import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FilterChips from './FilterChips.svelte';
import type { WorklistItem } from './types';

// Spec gm-worklist R2 + Scenario: filter chip narrows to one type; other chips
// unselected. aria-pressed reflects the active chip (design AD-3).

const item = (over: Partial<WorklistItem> = {}): WorklistItem => ({
  id: '1',
  type: 'ficha',
  name: 'N',
  author: 'A',
  createdAt: '2026-01-01T00:00:00Z',
  stale: false,
  detailHref: '/fichas/1',
  entityId: '1',
  ...over,
});

describe('FilterChips', () => {
  it('renders the four filter chips Todas/Fichas/Eventos/Crónicas', () => {
    const { unmount } = render(FilterChips, { items: [] });
    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fichas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eventos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crónicas' })).toBeInTheDocument();
    unmount();
  });

  it('starts with Todas pressed and the rest unpressed', () => {
    const { unmount } = render(FilterChips, { items: [] });
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fichas' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Eventos' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Crónicas' })).toHaveAttribute('aria-pressed', 'false');
    unmount();
  });

  it('clicking Fichas emits the narrowed list and toggles aria-pressed', async () => {
    const onFilter = vi.fn();
    const items = [
      item({ id: 'a', type: 'ficha' }),
      item({ id: 'b', type: 'evento' }),
      item({ id: 'c', type: 'cronica' }),
    ];
    render(FilterChips, { items, onFilter });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Fichas' }));

    expect(screen.getByRole('button', { name: 'Fichas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false');
    expect(onFilter).toHaveBeenLastCalledWith([items[0]], 'ficha');
  });
});
