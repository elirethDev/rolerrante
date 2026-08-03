import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Breadcrumbs from './Breadcrumbs.svelte';

const items = [
  { label: 'Foros', href: '/foro' },
  { label: 'Cuentos del Reino' },
];

describe('Breadcrumbs', () => {
  it('renders a breadcrumb nav with links and separators', () => {
    render(Breadcrumbs, { items });
    const nav = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    expect(screen.getByRole('link', { name: 'Foros' })).toHaveAttribute('href', '/foro');
    expect(nav).toHaveTextContent('Cuentos del Reino');
    expect(nav.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  it('marks the trailing crumb as the current page', () => {
    render(Breadcrumbs, { items });
    expect(screen.getByText('Cuentos del Reino')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Foros' })).not.toHaveAttribute('aria-current');
  });
});
