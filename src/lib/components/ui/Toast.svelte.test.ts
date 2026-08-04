import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dismiss, toast, toasts } from './toast';
import ToastStack from './ToastStack.svelte';

beforeEach(() => toasts.set([]));
afterEach(() => toasts.set([]));

describe('ToastStack', () => {
  it('renders the live region with role=status and stacks pushed toasts', async () => {
    render(ToastStack);
    toast('Historia publicada', 'success');
    toast('No tenés permiso para bloquear', 'danger');
    await tick();

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Historia publicada')).toBeInTheDocument();
    expect(screen.getByText('No tenés permiso para bloquear')).toBeInTheDocument();
  });

  it('applies the kind-specific border and icon colour class', async () => {
    render(ToastStack);
    toast('Cambios guardados como borrador', 'gold');
    await tick();

    const item = screen.getByText('Cambios guardados como borrador').closest('div.rounded-xl');
    expect(item).toHaveClass('border-[rgba(200,148,26,0.5)]');
    expect(item?.querySelector('svg')).toHaveClass('text-azeroth-gold-bright');
  });

  it('auto-dismisses each toast after its duration', async () => {
    render(ToastStack);
    toast('Se guardó el borrador', 'gold', 10);
    await tick();
    expect(screen.getByText('Se guardó el borrador')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByText('Se guardó el borrador')).not.toBeInTheDocument(),
    );
  });

  it('dismisses immediately when the close button is clicked', async () => {
    render(ToastStack);
    toast('Se guardó el borrador', 'gold', 10_000);
    await tick();

    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }));
    await waitFor(() =>
      expect(screen.queryByText('Se guardó el borrador')).not.toBeInTheDocument(),
    );
  });

  it('exposes dismiss() to the store to remove a toast by id', () => {
    render(ToastStack);
    toast('Se guardó el borrador', 'gold', 10_000);
    const id = get(toasts)[0].id;
    dismiss(id);
    expect(screen.queryByText('Se guardó el borrador')).not.toBeInTheDocument();
  });
});
