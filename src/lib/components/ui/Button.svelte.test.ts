import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Button from './Button.svelte';

const children = createRawSnippet(() => ({ render: () => 'Guardar' }));

describe('Button', () => {
  it('renders a button with its children text', () => {
    render(Button, { children });
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('applies the primary variant styles by default', () => {
    render(Button, { children });
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-linear-to-b');
    expect(btn).toHaveClass('text-[#1A1508]');
  });

  it('switches styles per variant', () => {
    const { unmount } = render(Button, { variant: 'ghost', children });
    let btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-transparent');
    unmount();

    render(Button, { variant: 'danger', children });
    btn = screen.getByRole('button');
    expect(btn).toHaveClass('text-[#FFF4EC]');
  });

  it('applies the link variant styling on an anchor when href is set', () => {
    render(Button, { href: '/perfil', variant: 'link', children });
    const link = screen.getByRole('link', { name: /guardar/i });
    expect(link).toHaveAttribute('href', '/perfil');
    expect(link).toHaveClass('text-azeroth-link');
  });

  it('applies sm and lg size classes', () => {
    const { unmount } = render(Button, { size: 'sm', children });
    expect(screen.getByRole('button')).toHaveClass('min-h-8');
    unmount();
    render(Button, { size: 'lg', children });
    expect(screen.getByRole('button')).toHaveClass('min-h-12');
  });

  it('adds w-full when block is set', () => {
    render(Button, { block: true, children });
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('is disabled when disabled and prevents anchor navigation', () => {
    const { unmount } = render(Button, { disabled: true, children });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('disabled:opacity-45');
    unmount();

    render(Button, { href: '/x', disabled: true, children });
    expect(screen.getByRole('link')).toHaveAttribute('aria-disabled', 'true');
  });

  it('forwards type=submit', () => {
    render(Button, { type: 'submit', children });
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
