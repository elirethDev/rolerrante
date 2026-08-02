import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Field from './Field.svelte';

const ctrl = createRawSnippet(() => ({ render: () => '<input type="text" placeholder="valor" />' }));

describe('Field', () => {
  it('renders legend with required marker and the control', () => {
    render(Field, { label: 'Nombre', required: true, ctrl });
    const legend = document.querySelector('legend');
    expect(legend).toHaveTextContent('Nombre');
    expect(legend).toHaveTextContent('*');
    expect(screen.getByPlaceholderText('valor')).toBeInTheDocument();
  });

  it('does not show required marker when not required', () => {
    render(Field, { label: 'Nombre', ctrl });
    expect(document.querySelector('legend')).toHaveTextContent('Nombre');
    expect(document.querySelector('legend')?.textContent).not.toContain('*');
  });

  it('renders hint with aria-describedby wiring and no error', () => {
    render(Field, { label: 'Nombre', hint: 'Elegí un nombre', ctrl });
    const fieldset = document.querySelector('fieldset');
    const hint = screen.getByText('Elegí un nombre');
    expect(hint).toBeInTheDocument();
    expect(fieldset).toHaveAttribute('aria-describedby', hint.id);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders error with role=alert and aria-describedby wiring, hides hint', () => {
    render(Field, { label: 'Nombre', hint: 'hint', error: 'Campo obligatorio', ctrl });
    const fieldset = document.querySelector('fieldset');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Campo obligatorio');
    expect(fieldset).toHaveAttribute('aria-describedby', alert.id);
    expect(screen.queryByText('hint')).not.toBeInTheDocument();
  });

  it('applies sm size density class and 13px legend', () => {
    render(Field, { label: 'Nombre', size: 'sm', ctrl });
    expect(document.querySelector('fieldset')).toHaveClass('fieldset-sm');
    expect(document.querySelector('.fieldset-legend')).toHaveClass('text-[13px]');
  });

  it('does not apply sm class at default md size', () => {
    render(Field, { label: 'Nombre', ctrl });
    expect(document.querySelector('fieldset')).not.toHaveClass('fieldset-sm');
  });

  it('renders the control unit (legacy children slot) as ctrl snippet', () => {
    render(Field, { label: 'Nombre', ctrl });
    // REQ-FP-01: consumer control injected via {#snippet ctrl()} renders inside fieldset
    const control = screen.getByPlaceholderText('valor');
    expect(control.closest('fieldset')).toBeInTheDocument();
  });
});
