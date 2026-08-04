import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Input from './Input.svelte';

describe('Input', () => {
  it('renders a text input that reports its bound value', () => {
    render(Input, { value: 'Kareth' });
    expect(screen.getByRole('textbox')).toHaveValue('Kareth');
  });

  it('updates the native value on user typing', () => {
    render(Input, {});
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'Vientos' } });
    expect(input.value).toBe('Vientos');
  });

  it('marks invalid state with aria-invalid and the danger border', () => {
    render(Input, { invalid: true });
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveClass('border-azeroth-danger');
  });

  it('forwards placeholder, required, disabled and aria-label', () => {
    render(Input, {
      placeholder: 'Nombre del personaje',
      required: true,
      disabled: true,
      'aria-label': 'Nombre',
    });
    const input = screen.getByRole('textbox', { name: 'Nombre' });
    expect(input).toHaveAttribute('placeholder', 'Nombre del personaje');
    expect(input).toBeRequired();
    expect(input).toBeDisabled();
  });
});
