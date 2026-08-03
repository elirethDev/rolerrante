import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';
import ModalHarness from './ModalHarness.svelte';

const focusables = () =>
  screen.getByRole('dialog').querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );

describe('Modal', () => {
  it('does not render when closed', () => {
    render(ModalHarness, { open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a labelled, aria-modal dialog with content and footer when open', () => {
    render(ModalHarness, { open: true });
    expect(screen.getByText('¿Confirmás el cierre del hilo?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Cerrar hilo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus into the panel when it opens', async () => {
    const { rerender } = render(ModalHarness, { open: false });
    await rerender({ open: true });
    await tick();
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('closes on Escape', async () => {
    const { rerender } = render(ModalHarness, { open: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    await rerender({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    render(ModalHarness, { open: true });
    const root = screen.getByRole('dialog').parentElement;
    await fireEvent.click(root?.children[0] as HTMLElement);
    await tick();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes via the close (X) button', async () => {
    render(ModalHarness, { open: true, closeLabel: 'Cerrar diálogo' });
    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' }));
    await tick();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('traps Tab focus within the dialog, wrapping at both ends', () => {
    render(ModalHarness, { open: true });
    const els = focusables();
    expect(els.length).toBeGreaterThanOrEqual(3);

    const first = els[0] as HTMLElement;
    const last = els[els.length - 1] as HTMLElement;

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });
});
