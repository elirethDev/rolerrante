import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import CharacterSheetSummary from './CharacterSheetSummary.svelte';

const base = {
  name: 'Aragorn',
  race: 'Dúnedain',
  age: 87,
  sex: 'Hombre',
  attr_fis: 12,
  attr_des: 11,
  attr_int: 9,
  attr_per: 10,
  attr_esp: 9,
  mana_source: 'I' as const,
  status: 'aprobado',
  rp_points: 5,
};

describe('CharacterSheetSummary avatar', () => {
  it('renders a lazy-loaded <img> with the avatar_url when one is set (REQ-CAV-02.1)', () => {
    render(CharacterSheetSummary, {
      character: { ...base, avatar_url: 'https://img.example.com/char.png' },
    });

    const img = screen.getByAltText('Avatar de Aragorn');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('https://img.example.com/char.png');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('shows only the initial placeholder and no <img> when avatar_url is null (REQ-CAV-02.3)', () => {
    render(CharacterSheetSummary, { character: { ...base, avatar_url: null } });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const placeholder = screen.getByTestId('character-avatar-initial');
    expect(placeholder).toHaveTextContent('A');
  });

  it('swaps to the initial placeholder when the remote image fails to load (REQ-CAV-02.3)', async () => {
    render(CharacterSheetSummary, {
      character: { ...base, avatar_url: 'https://img.example.com/broken.png' },
    });

    const img = screen.getByAltText('Avatar de Aragorn');
    await fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('character-avatar-initial')).toHaveTextContent('A');
  });

  it('uppercases the first character name letter for the placeholder', () => {
    render(CharacterSheetSummary, { character: { ...base, name: 'legolas', avatar_url: null } });

    expect(screen.getByTestId('character-avatar-initial')).toHaveTextContent('L');
  });
});

describe('CharacterSheetSummary ficha layout (OD .kpis + badge row)', () => {
  it('renders the KPI row with Raza/Clase/Origen/Alineamiento labels and real data where available', () => {
    render(CharacterSheetSummary, {
      character: { ...base, race: { name: 'Dúnedain', group_name: 'Reinos Aliados' } },
    });

    const kpis = screen.getByTestId('character-kpis');
    expect(kpis).toBeInTheDocument();
    expect(screen.getByText('Raza')).toBeInTheDocument();
    expect(screen.getByText('Dúnedain')).toBeInTheDocument();
    expect(screen.getByText('Origen')).toBeInTheDocument();
    expect(screen.getByText('Reinos Aliados')).toBeInTheDocument();
    expect(screen.getByText('Clase')).toBeInTheDocument();
    expect(screen.getByText('Alineamiento')).toBeInTheDocument();
  });

  it('shows status badge, gold Canon badge and optional Nivel badge for approved characters', () => {
    render(CharacterSheetSummary, { character: { ...base, status: 'aprobado', nivel: 12 } });

    expect(screen.getByTestId('character-status-badge')).toHaveTextContent('Aprobado');
    expect(screen.getByTestId('character-canon-badge')).toHaveTextContent('Canon');
    expect(screen.getByText('Nivel 12')).toBeInTheDocument();
  });

  it('hides the Canon badge for non-approved characters', () => {
    render(CharacterSheetSummary, { character: { ...base, status: 'pendiente' } });

    expect(screen.getByTestId('character-status-badge')).toHaveTextContent('Pendiente');
    expect(screen.queryByTestId('character-canon-badge')).not.toBeInTheDocument();
  });
});
