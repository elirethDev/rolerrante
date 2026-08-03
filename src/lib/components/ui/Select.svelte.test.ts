import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SelectHarness from './SelectHarness.svelte';

describe('Select', () => {
  it('renders a combobox with the provided options', () => {
    render(SelectHarness);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('reflects the bound value as the selected option', () => {
    render(SelectHarness, { value: 'b' });
    expect((screen.getByRole('option', { name: 'Horda' }) as HTMLOptionElement).selected).toBe(true);
    expect((screen.getByRole('option', { name: 'Azeroth' }) as HTMLOptionElement).selected).toBe(false);
  });

  it('updates its native value on user selection', () => {
    render(SelectHarness, { value: 'a' });
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('a');
    fireEvent.change(select, { target: { value: 'b' } });
    expect(select.value).toBe('b');
  });

  it('marks the control invalid with aria-invalid and the invalid border', () => {
    render(SelectHarness, { invalid: true });
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox')).toHaveClass('border-azeroth-danger');
  });

  it('forwards required, disabled and accessible label', () => {
    render(SelectHarness, { required: true, disabled: true, 'aria-label': 'Zona' });
    const select = screen.getByRole('combobox', { name: 'Zona' });
    expect(select).toBeRequired();
    expect(select).toBeDisabled();
  });
});
