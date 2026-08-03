import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Avatar from './Avatar.svelte';

describe('Avatar', () => {
  it('renders the initial fallback derived from the name', () => {
    render(Avatar, { name: 'Gareth' });
    expect(screen.getByText('G')).toBeInTheDocument();
  });

  it('renders an image with alt and object-cover when src is provided', () => {
    render(Avatar, { src: '/gareth.png', alt: 'Avatar de Gareth' });
    const img = screen.getByRole('img', { name: 'Avatar de Gareth' });
    expect(img).toHaveAttribute('src', '/gareth.png');
    expect(img).toHaveClass('object-cover');
  });

  it('applies ring styling when ring is set', () => {
    const { unmount } = render(Avatar, { name: 'G', ring: true });
    expect(screen.getByText('G')).toHaveClass('border-azeroth-gold-dim');
    unmount();

    render(Avatar, { name: 'G' });
    expect(screen.getByText('G')).not.toHaveClass('border-azeroth-gold-dim');
  });

  it('shows the staff mark when staff is set', () => {
    render(Avatar, { name: 'G', staff: true });
    expect(screen.getByText('✦')).toBeInTheDocument();
  });

  it('applies size classes including sm, lg and xl', () => {
    const { unmount } = render(Avatar, { name: 'G', size: 'sm' });
    expect(screen.getByText('G')).toHaveClass('h-[30px]');
    unmount();
    render(Avatar, { name: 'G', size: 'xl' });
    expect(screen.getByText('G')).toHaveClass('h-[92px]');
  });
});
