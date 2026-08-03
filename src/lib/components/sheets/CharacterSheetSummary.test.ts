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
