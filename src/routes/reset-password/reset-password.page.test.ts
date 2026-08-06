/* eslint-disable @typescript-eslint/no-explicit-any -- route component props are typed via $types */
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';

// OD reset-password.html:62 — strength track (Débil / Buena / Fuerte).
describe('reset-password strength meter', () => {
  it('is hidden until a password is typed', () => {
    render(Page, { form: {} } as any);
    expect(screen.queryByTestId('pw-strength')).not.toBeInTheDocument();
  });

  it('labels a weak password Débil', async () => {
    const { container } = render(Page, { form: {} } as any);
    const user = userEvent.setup();
    await user.type(container.querySelector('#password') as HTMLInputElement, 'abc');
    expect(screen.getByTestId('pw-strength')).toBeInTheDocument();
    expect(screen.getByTestId('pw-strength-label')).toHaveTextContent('Débil');
  });

  it('labels a strong password Fuerte', async () => {
    const { container } = render(Page, { form: {} } as any);
    const user = userEvent.setup();
    await user.type(container.querySelector('#password') as HTMLInputElement, 'Abcd1234!');
    expect(screen.getByTestId('pw-strength-label')).toHaveTextContent('Fuerte');
  });

  it('labels a mid-strength password Buena', async () => {
    const { container } = render(Page, { form: {} } as any);
    const user = userEvent.setup();
    // length >= 8 + digit, no uppercase symbol → 2 points → Buena
    await user.type(container.querySelector('#password') as HTMLInputElement, 'abcdefg8');
    expect(screen.getByTestId('pw-strength-label')).toHaveTextContent('Buena');
  });
});