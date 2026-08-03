import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Pager from './Pager.svelte';

describe('Pager', () => {
  it('renders one link per page plus prev/next for multi-page results', () => {
    render(Pager, { currentPage: 1, totalPages: 3 });
    expect(screen.getByRole('link', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /siguiente/i })).toBeInTheDocument();
  });

  it('marks the active page with aria-current="page"', () => {
    render(Pager, { currentPage: 2, totalPages: 4 });
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '1' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('disables the prev control at page 1', () => {
    render(Pager, { currentPage: 1, totalPages: 3 });
    expect(screen.getByRole('link', { name: /anterior/i })).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables the next control at the last page', () => {
    render(Pager, { currentPage: 3, totalPages: 3 });
    expect(screen.getByRole('link', { name: /siguiente/i })).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders nothing when there is only one page (pages <= 1)', () => {
    render(Pager, { currentPage: 1, totalPages: 1 });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
