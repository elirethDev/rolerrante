import { render, screen, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AttributeInput from './AttributeInput.svelte';

describe('AttributeInput', () => {
  it('displays label and value, resolves $lib alias', () => {
    render(AttributeInput, { label: 'Fuerza', value: 5 });
    expect(screen.getByText('Fuerza')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    // alias resolution: ATTR_BASE_VALUE=4, ATTR_MAX=10 from $lib/rules
    expect(screen.getByText(/base 4/)).toBeInTheDocument();
    expect(screen.getByText(/máx 10/)).toBeInTheDocument();
  });

  it('Plus fires onchange with incremented value', () => {
    const onChange = vi.fn();
    render(AttributeInput, { label: 'Fuerza', value: 5, max: 10, onchange: onChange });
    fireEvent.click(screen.getByRole('button', { name: /aumentar fuerza/i }));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('Plus button is disabled at max, onchange not called', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(AttributeInput, { label: 'Fuerza', value: 10, max: 10, onchange: onChange });
    const plusBtn = screen.getByRole('button', { name: /aumentar fuerza/i });
    expect(plusBtn).toBeDisabled();
    await user.click(plusBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Minus fires onchange with decremented value', () => {
    const onChange = vi.fn();
    render(AttributeInput, { label: 'Fuerza', value: 5, min: 4, onchange: onChange });
    fireEvent.click(screen.getByRole('button', { name: /disminuir fuerza/i }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('Minus button is disabled at min, onchange not called', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(AttributeInput, { label: 'Fuerza', value: 4, min: 4, onchange: onChange });
    const minusBtn = screen.getByRole('button', { name: /disminuir fuerza/i });
    expect(minusBtn).toBeDisabled();
    await user.click(minusBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the w-10 stepper width and uses a fieldset+legend wrapper (REQ-FS-05)', () => {
    render(AttributeInput, { label: 'Fuerza', value: 5 });
    // fieldset wrapper comes from the Field primitive
    const fieldset = document.querySelector('fieldset');
    expect(fieldset).toBeInTheDocument();
    expect(document.querySelector('legend')?.textContent).toBe('Fuerza');
    // the value span keeps its w-10 stepper width
    const valueSpan = screen.getByText('5').closest('span');
    expect(valueSpan?.classList).toContain('w-10');
  });
});
