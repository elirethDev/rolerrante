import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ReportModal from './ReportModal.svelte';

describe('ReportModal', () => {
  it('renders a Reportar trigger button', () => {
    render(ReportModal, { postId: 'p1' });
    expect(screen.getByRole('button', { name: /Reportar/i })).toBeInTheDocument();
  });

  it('opens the dialog with a reason field and submits to ?/report on trigger click', async () => {
    const user = userEvent.setup();
    render(ReportModal, { postId: 'p1' });
    await user.click(screen.getByRole('button', { name: /Reportar/i }));

    // The dialog is now visible with a reason input and a hidden post_id.
    const form = screen.getByTestId('report-form');
    expect(form).toHaveAttribute('action', '?/report');
    expect(form.querySelector('input[name="post_id"]')).toHaveValue('p1');
    expect(
      screen.getByRole('textbox', { name: /Motivo/i }) ?? screen.getByLabelText(/Motivo/i),
    ).toBeInTheDocument();
  });

  it('requires a reason before submitting (submit disabled while empty)', async () => {
    const user = userEvent.setup();
    render(ReportModal, { postId: 'p1' });
    await user.click(screen.getByRole('button', { name: /Reportar/i }));

    // Real behavior: the submit button is disabled until a non-empty reason.
    const submitBtn = screen.getByRole('button', { name: /Enviar reporte/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    const reason = screen.getByLabelText(/Motivo/i) as HTMLTextAreaElement;
    await user.type(reason, 'Contenido ofensivo');
    expect((screen.getByRole('button', { name: /Enviar reporte/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );

    await user.clear(reason);
    expect((screen.getByRole('button', { name: /Enviar reporte/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('closes the dialog when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(ReportModal, { postId: 'p1' });
    await user.click(screen.getByRole('button', { name: /Reportar/i }));
    expect(screen.getByTestId('report-form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cerrar/i }));
    expect(screen.queryByTestId('report-form')).not.toBeInTheDocument();
  });
});
