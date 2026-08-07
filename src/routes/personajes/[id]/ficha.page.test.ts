import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { PageData } from './$types';
import FichaPage from './+page.svelte';

const character = {
  id: 'char-1',
  player_id: 'user-1',
  name: 'Aragorn',
  race: { name: 'Dúnedain', group_name: 'Reinos Aliados' },
  age: 87,
  sex: 'Hombre',
  physical_description: 'Guardián del norte, heredero de la espada rota.',
  mana_source: 'I',
  attr_fis: 8,
  attr_des: 7,
  attr_int: 6,
  attr_per: 5,
  attr_esp: 4,
  rp_points: 5,
  status: 'aprobado',
  review_notes: null,
  reviewed_by: 'gm-1',
  reviewed_at: '2026-01-02',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  avatar_url: 'https://img.example.com/aragorn.png',
  skills: [
    { id: 'cs1', skill: { name: 'Reflejos' }, level: 3, specialization: null },
  ],
  stories: [
    { id: 'st1', title: 'La canción de la brisa', status: 'aprobado' as const },
    { id: 'st2', title: 'Acto II — Lo que duerme bajo el glaciar', status: 'pendiente' as const },
  ],
};

const profile = {
  id: 'user-1',
  username: 'aragorn',
  display_name: 'Aragorn',
  avatar_url: null,
  role: 'rolero' as const,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const makeData = (overrides: Record<string, unknown> = {}) =>
  ({ character, profile, ...overrides }) as unknown as PageData;

function renderPage(data: PageData) {
  return render(FichaPage, { data });
}

describe('personajes/[id] ficha layout (OD side-layout redesign)', () => {
  it('renders the profile card with the OD KPI badges for an approved ficha', () => {
    renderPage(makeData());

    expect(screen.getByText('Dúnedain')).toBeInTheDocument();
    expect(screen.getByText('Reinos Aliados')).toBeInTheDocument();
    expect(screen.getByTestId('character-canon-badge')).toHaveTextContent('Canon');
  });

  it('shows the player-set Origen when present (fallback to race group otherwise)', () => {
    renderPage(makeData({ character: { ...character, origin: "Quel'Thalas" } }));
    expect(screen.getByText("Quel'Thalas")).toBeInTheDocument();
    // El Origen del jugador reemplaza al grupo de la raza en esa celda.
    expect(screen.queryByText('Reinos Aliados')).not.toBeInTheDocument();
  });

  it('renders the narrative blocks (Pasado/Presente/Objetivos) from the backstory', () => {
    renderPage(makeData());

    expect(screen.getByRole('heading', { name: 'Pasado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Presente' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Objetivos' })).toBeInTheDocument();
    expect(screen.getByText(/Guardián del norte/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'La historia como hilo del foro' }),
    ).toBeInTheDocument();
  });

  it('links the crónica activa and story-thread rows to their stories', () => {
    renderPage(makeData());

    const crónica = screen.getByRole('link', { name: 'La canción de la brisa' });
    expect(crónica.getAttribute('href')).toBe('/historias/st1');
    const actos = screen.getAllByRole('link', { name: /Acto II/ });
    expect(actos.length).toBeGreaterThan(0);
    for (const acto of actos) expect(acto.getAttribute('href')).toBe('/historias/st2');
  });

  it('shows the Editar ficha link to the owner (PR #41)', () => {
    renderPage(makeData());

    const link = screen.getByRole('link', { name: 'Editar ficha' });
    expect(link.getAttribute('href')).toBe('/personajes/char-1/editar');
  });

  it('hides the Editar ficha link from visitors who are not the owner or staff', () => {
    renderPage(makeData({ profile: { ...profile, id: 'other-9' } }));

    expect(screen.queryByRole('link', { name: 'Editar ficha' })).not.toBeInTheDocument();
  });

  it('shows GM moderation controls to GM users on pending fichas', () => {
    renderPage(
      makeData({
        character: { ...character, status: 'pendiente' },
        profile: { ...profile, id: 'gm-1', role: 'gm' },
      }),
    );

    expect(screen.getByRole('button', { name: /Aprobar ficha/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rechazar/ })).toBeInTheDocument();
  });

  it('shows an "En revisión" state badge for a pending ficha (re-submission loop)', () => {
    renderPage(makeData({ character: { ...character, status: 'pendiente', reviewed_at: null } }));

    expect(screen.getByTestId('character-revision-state')).toBeInTheDocument();
    expect(screen.getByTestId('character-revision-state')).toHaveTextContent('En revisión');
  });

  it('does not show "En revisión" for an approved ficha', () => {
    renderPage(makeData());

    expect(screen.queryByTestId('character-revision-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('character-canon-badge')).toBeInTheDocument();
  });

  it('hides GM moderation controls from non-staff viewers', () => {
    renderPage(makeData({ character: { ...character, status: 'pendiente' } }));

    expect(screen.queryByRole('button', { name: /Aprobar ficha/ })).not.toBeInTheDocument();
  });
});
