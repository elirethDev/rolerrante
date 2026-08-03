import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ReplyComposer from './ReplyComposer.svelte';

describe('ReplyComposer', () => {
  it('renders a submit button with the default label', () => {
    render(ReplyComposer);
    expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
  });

  it('renders a custom submit label', () => {
    render(ReplyComposer, { submitLabel: 'Crear debate' });
    expect(screen.getByRole('button', { name: 'Crear debate' })).toBeInTheDocument();
  });

  it('posts to the given action (reply) via form method', () => {
    render(ReplyComposer, { action: '?/reply' });
    const form = document.querySelector('form');
    expect(form).toHaveAttribute('method', 'POST');
    expect(form).toHaveAttribute('action', '?/reply');
  });
});
