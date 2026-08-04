import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Checkbox from './Checkbox.svelte';

describe('Checkbox', () => {
  it('renders a checkbox whose accessible name comes from the label', () => {
    render(Checkbox, { label: 'Permitir respuestas' });
    const input = screen.getByRole('checkbox', { name: 'Permitir respuestas' });
    expect(input).toBeInTheDocument();
    expect(input).not.toBeChecked();
  });

  it('toggles checked state when the user clicks it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(Checkbox, { label: 'Acepto la normativa', checked: false });
    const input = screen.getByRole('checkbox');

    await user.click(input);
    expect(input).toBeChecked();

    await rerender({ checked: false });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('renders the custom gold fill when checked', () => {
    render(Checkbox, { label: 'Crónica activa', checked: true });
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(document.querySelector('label span[aria-hidden="true"]')).toHaveClass(
      'border-azeroth-gold',
    );
  });

  it('stays off when disabled', async () => {
    const user = userEvent.setup();
    render(Checkbox, { label: 'Bloqueado', disabled: true });
    const input = screen.getByRole('checkbox');
    expect(input).toBeDisabled();
    await user.click(input);
    expect(input).not.toBeChecked();
  });

  it('forwards name and value', () => {
    render(Checkbox, { label: 'Fijar', name: 'sticky', value: '1' });
    const input = screen.getByRole('checkbox');
    expect(input).toHaveAttribute('name', 'sticky');
    expect(input).toHaveAttribute('value', '1');
  });
});
