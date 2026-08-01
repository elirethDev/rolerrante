import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import CombatValues from './CombatValues.svelte';
import { combatValues } from '$lib/rules';
import type { Character, CharacterSkill } from '$lib/types';

const baseAttrs = {
  attr_fis: 10,
  attr_des: 8,
  attr_int: 6,
  attr_per: 7,
  attr_esp: 6,
};

describe('CombatValues', () => {
  it('renders the combat stats card with values from rules.combatValues', () => {
    const { container } = render(CombatValues, { attrs: baseAttrs });

    expect(screen.getByText('Valores de combate')).toBeInTheDocument();

    const char = { ...baseAttrs, mana_source: 'E' } as Character;
    const expected = combatValues(char, []);

    // Each stat label + its value is rendered
    const rows = container.querySelectorAll('.card .grid > div');
    expect(rows.length).toBe(7);

    // Spot-check values against the rules source of truth
    expect(container.textContent).toContain(String(expected.pv));
    expect(container.textContent).toContain(String(expected.pm));
    expect(container.textContent).toContain(String(expected.iniciativa));
    expect(container.textContent).toContain(String(expected.defensa));
  });

  it('renders the skills table when skills are provided', () => {
    const skills = [
      {
        skill: { name: 'Espadas', attribute: 'attr_des' },
        level: 3,
        specialization: 'Mandoble',
      },
    ] as unknown as CharacterSkill[];

    render(CombatValues, { attrs: baseAttrs, skills });

    expect(screen.getByText('Habilidades')).toBeInTheDocument();
    expect(screen.getByText('Espadas')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Mandoble')).toBeInTheDocument();
  });

  it('defaults mana_source to E without crashing', () => {
    const { container } = render(CombatValues, { attrs: baseAttrs });
    // No mana_source supplied — defaults to 'E'; renders without error
    expect(container.querySelector('.card')).not.toBeNull();
  });
});
