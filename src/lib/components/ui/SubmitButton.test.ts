import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import SubmitButton from './SubmitButton.svelte';

const children = createRawSnippet(() => ({ render: () => 'Guardar' }));

describe('SubmitButton', () => {
  it('renders children text', () => {
    render(SubmitButton, { children });
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('has aria-busy="true" when pending', () => {
    render(SubmitButton, { pending: true, children });
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows spinner only when pending', () => {
    const { unmount } = render(SubmitButton, { pending: true, children });
    expect(document.querySelector('.loading.loading-spinner.loading-sm')).toBeInTheDocument();
    unmount();

    render(SubmitButton, { pending: false, children });
    expect(document.querySelector('.loading-spinner')).not.toBeInTheDocument();
  });

  it('is disabled when pending', () => {
    render(SubmitButton, { pending: true, children });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(SubmitButton, { disabled: true, children });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is enabled when neither pending nor disabled', () => {
    render(SubmitButton, { children });
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('merges class into btn btn-primary', () => {
    render(SubmitButton, { class: 'extra', children });
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('btn');
    expect(btn).toHaveClass('btn-primary');
    expect(btn).toHaveClass('extra');
  });
});
