import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LockBadge from './LockBadge.svelte';

describe('LockBadge', () => {
  it('renders a lock indicator with accessible text', () => {
    render(LockBadge);
    expect(screen.getByTestId('lock-badge')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
  });
});
