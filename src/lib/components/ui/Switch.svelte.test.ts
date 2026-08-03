import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Switch from './Switch.svelte';

describe('Switch', () => {
  it('renders a switch whose accessible name comes from the label', () => {
    render(Switch, { label: 'Notificar', checked: true });
    const input = screen.getByRole('switch', { name: 'Notificar' });
    expect(input).toBeInTheDocument();
    expect(input).toBeChecked();
  });

  it('reflects the bound checked state when the user toggles it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(Switch, { label: 'Ver hilos', checked: false });
    const input = screen.getByRole('switch');
    expect(input).not.toBeChecked();

    await user.click(input);
    expect(input).toBeChecked();

    await rerender({ checked: false });
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('applies the gold track and moved knob when checked', () => {
    const { unmount } = render(Switch, { label: 'Publicar', checked: true });
    const track = document.querySelector('label span[aria-hidden="true"]');
    expect(track).toHaveClass('border-azeroth-gold');
    expect(track?.querySelector('span')).toHaveClass('translate-x-[18px]');
    unmount();

    render(Switch, { label: 'Publicar', checked: false });
    expect(document.querySelector('label span[aria-hidden="true"] span')).toHaveClass(
      'translate-x-0',
    );
  });

  it('stays off when disabled', async () => {
    const user = userEvent.setup();
    render(Switch, { label: 'Fijar', disabled: true });
    const input = screen.getByRole('switch');
    expect(input).toBeDisabled();
    await user.click(input);
    expect(input).not.toBeChecked();
  });
});
