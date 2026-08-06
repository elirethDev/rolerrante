import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import CharacterCard from './CharacterCard.svelte';

const base = {
  id: 'c1',
  name: 'Aragorn',
  age: 87,
  status: 'aprobado',
  avatar_url: 'https://img.example.com/aragorn.png',
  race: { name: 'Humanos' },
  player: { display_name: 'Pablo', username: 'pablo' },
};

function renderCard(char: Record<string, unknown>) {
  return render(CharacterCard, { props: { char: char as never } });
}

describe('CharacterCard — census card (avatar + status-line + value)', () => {
  it('renders the avatar image, a status badge and the race/age value line', () => {
    renderCard(base);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', 'https://img.example.com/aragorn.png');
    expect(avatar).toHaveAttribute('alt', 'Aragorn');
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText(/Humanos · 87 años/i)).toBeInTheDocument();
    expect(screen.getByText(/por Pablo/i)).toBeInTheDocument();
  });

  it('falls back to the initial letter when the character has no avatar_url', () => {
    renderCard({ ...base, avatar_url: null });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('links to the ficha and reflects the status label for drafts', () => {
    renderCard({ ...base, status: 'borrador', avatar_url: null });
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('A').closest('a')).toHaveAttribute('href', '/personajes/c1');
  });
});
