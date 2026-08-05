import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { ActionData, PageData } from './$types';
import EditPage from './+page.svelte';

const character = {
  id: 'char-1',
  player_id: 'user-1',
  name: 'Aragorn',
  race_id: 'r1',
  age: 87,
  sex: 'Hombre',
  physical_description: 'Guardián del norte',
  mana_source: 'I',
  attr_fis: 8,
  attr_des: 7,
  attr_int: 6,
  attr_per: 5,
  attr_esp: 4,
  rp_points: 5,
  status: 'pendiente',
  review_notes: 'rechazado',
  reviewed_by: 'gm-1',
  reviewed_at: '2026-01-01',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  avatar_url: 'https://img.example.com/aragorn.png',
} as never;

const races = [{ id: 'r1', name: 'Dúnedain' }, { id: 'r2', name: 'Elfo' }];

const makeData = (overrides: Record<string, unknown> = {}) =>
  ({ character, races, isStaff: false, isOwner: true, ...overrides });

function renderPage(dataOverrides: Record<string, unknown> = {}, form: Record<string, unknown> = {}) {
  return render(EditPage, {
    data: makeData(dataOverrides) as unknown as PageData,
    form: form as unknown as ActionData,
  });
}

describe('personajes/[id]/editar form (REQ-CFD-01.2 / REQ-CFD-03.1)', () => {
  it('loads the edit form pre-filled with character data (name, avatar, status)', () => {
    renderPage();

    const nameInput = document.getElementById('name') as HTMLInputElement;
    expect(nameInput.value).toBe('Aragorn');

    const avatarInput = document.getElementById('avatar_url') as HTMLInputElement;
    expect(avatarInput.value).toBe('https://img.example.com/aragorn.png');

    const statusSelect = document.getElementById('status') as HTMLSelectElement;
    expect(statusSelect.value).toBe('pendiente');
  });

  it('has a status dropdown with borrador and pendiente options (REQ-CFD-02.1)', () => {
    renderPage();
    const statusSelect = document.getElementById('status') as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map((o) => o.value);
    expect(options).toEqual(['borrador', 'pendiente']);
  });

  it('surfaces an avatar_url validation error returned by the server (rollback UI)', () => {
    renderPage({}, { errors: { avatar_url: 'URL de avatar no válida' }, message: 'Corrige los campos marcados en rojo' });
    expect(screen.getAllByText('URL de avatar no válida').length).toBeGreaterThan(0);
  });

  it('offers "Guardar y enviar a revisión" to the owner, posting to ?/request_review', () => {
    renderPage();

    const reviewBtn = screen.getByRole('button', { name: 'Guardar y enviar a revisión' });
    expect(reviewBtn.getAttribute('formaction')).toBe('?/request_review');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
  });

  it('hides "Guardar y enviar a revisión" for staff editing someone else ficha', () => {
    renderPage({ isOwner: false, isStaff: true });

    expect(screen.queryByRole('button', { name: 'Guardar y enviar a revisión' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
  });
});
