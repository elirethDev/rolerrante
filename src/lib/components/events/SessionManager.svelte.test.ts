import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import SessionManager from './SessionManager.svelte';

const sessions = [
  {
    id: 's1',
    title: 'Bosque Sombrío',
    summary: 'Primera salida del grupo',
    session_date: '2026-03-01',
    counts_as_masteo: true,
  },
  {
    id: 's2',
    title: null,
    summary: null,
    session_date: '2026-03-08',
    counts_as_masteo: false,
  },
];

describe('SessionManager', () => {
  it('renders the inline create form with Fecha/Título/Resumen fields and masteo checkbox', () => {
    render(SessionManager, { sessions });

    const legends = [...document.querySelectorAll('legend')].map((l) => l.textContent?.trim());
    expect(legends.some((l) => l?.startsWith('Fecha'))).toBe(true);
    expect(legends).toContain('Título');
    expect(legends).toContain('Resumen');

    expect(document.querySelector('input#session_date[name="session_date"]')).toHaveClass('input');
    expect(
      screen.getByRole('checkbox', { name: 'Cuenta como masterización' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Añadir sesión' })).toBeInTheDocument();
  });

  it('lists each session with its fields, masteo badge and edit/delete actions', () => {
    render(SessionManager, { sessions });

    expect(screen.getByText('Bosque Sombrío')).toBeInTheDocument();
    expect(screen.getByText('Primera salida del grupo')).toBeInTheDocument();
    expect(screen.getByText('Sí')).toBeInTheDocument();
    expect(screen.getAllByText('No')).toHaveLength(1);

    const dateInputs = [...document.querySelectorAll('input')].filter(
      (i) => i.id === 'edit_session_date_s1' || i.id === 'edit_session_date_s2',
    );
    expect(dateInputs).toHaveLength(0);

    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(2);
  });

  it('shows the update form with prefilled values when Editar is clicked', async () => {
    const user = userEvent.setup();
    render(SessionManager, { sessions });

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();

    const dateInput = document.querySelector(
      'input#edit_session_date_s1[name="session_date"]',
    ) as HTMLInputElement;
    expect(dateInput).toHaveValue('2026-03-01');

    const titleInput = document.querySelector(
      'input#edit_title_s1[name="title"]',
    ) as HTMLInputElement;
    expect(titleInput).toHaveValue('Bosque Sombrío');

    const hiddenId = document.querySelector(
      'input[type="hidden"][name="session_id"][value="s1"]',
    );
    expect(hiddenId).toBeInTheDocument();

    expect(document.querySelector('input#edit_session_date_s2')).toBeNull();
  });

  it('shows an empty-state message when there are no sessions', () => {
    render(SessionManager, { sessions: [] });
    expect(screen.getByText(/Aún no hay sesiones/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Añadir sesión' })).toBeInTheDocument();
  });
});
