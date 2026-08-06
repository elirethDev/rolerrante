import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { ATTR_POINTS_BUDGET, ATTR_MIN, ATTR_MAX } from '$lib/rules';
import Page from './+page.svelte';

const makeData = (overrides: Record<string, unknown> = {}) =>
  ({
    races: [
      { id: 'r1', name: 'Dúnedain', group_name: 'Reinos Aliados' },
      { id: 'r2', name: 'Élfico', group_name: 'Reinos Aliados' },
    ],
    skills: [
      {
        id: 'sk1',
        name: 'Reflejos',
        attribute: 'des',
        description: 'Reacciones rápidas',
        requires_specialization: false,
      },
    ],
    creationPoints: 25,
    ...overrides,
  }) as never;

describe('personajes/nuevo — ficha rules sidebar', () => {
  it('renders the "Reglas del censo" card with the real attribute budget', () => {
    render(Page, { data: makeData(), form: null });

    expect(screen.getByText('Reglas del censo')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`hasta ${ATTR_POINTS_BUDGET} puntos`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`sin pasar de ${ATTR_MAX}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`mínimo \\(${ATTR_MIN}\\)`))).toBeInTheDocument();
  });

  it('lists the real skill budget from the settings value', () => {
    render(Page, { data: makeData(), form: null });

    expect(screen.getByText(/Contás con 25 puntos/)).toBeInTheDocument();
  });

  it('renders the "¿Y después?" onboarding card', () => {
    render(Page, { data: makeData(), form: null });

    expect(screen.getByText('¿Y después?')).toBeInTheDocument();
    expect(screen.getByText(/envías la ficha a revisión/i)).toBeInTheDocument();
    expect(screen.getByText(/entra al canon/i)).toBeInTheDocument();
  });

  it('keeps the numbered creation flow (sections 1-3) and the combat preview as a distinct section', () => {
    render(Page, { data: makeData(), form: null });

    expect(screen.getByRole('heading', { name: 'Datos básicos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Atributos/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Habilidades' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vista previa de combate' })).toBeInTheDocument();
  });
});
