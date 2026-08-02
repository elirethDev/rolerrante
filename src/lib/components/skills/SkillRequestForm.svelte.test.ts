import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SkillRequestForm from './SkillRequestForm.svelte';

const characters = [
  { id: 'c1', name: 'Aragorn', rp_points: 12, skills: [] },
  { id: 'c2', name: 'Legolas', rp_points: 5, skills: [] },
];

describe('SkillRequestForm', () => {
  it('renders the character select wrapped in Field (REQ-FS-02)', () => {
    render(SkillRequestForm, { characters });
    expect(document.querySelectorAll('fieldset').length).toBeGreaterThan(0);
    expect(document.querySelector('legend')?.textContent).toContain('Personaje');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    // zero horizontal <label> rows remain for the character control
    expect(document.querySelectorAll('label')).toHaveLength(0);
  });

  it('passes bindings through Field on the character select (REQ-FP-02)', async () => {
    render(SkillRequestForm, { characters });
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: 'c2' } });
    expect(select.value).toBe('c2');
    // the selected character influences available skill points rendering (Legolas = 5 xp)
    expect(screen.getAllByText(/5 pts/i).length).toBeGreaterThan(0);
  });

  it('forwards size to the SkillPicker via sm fieldset density', () => {
    render(SkillRequestForm, { characters, skills: [{ skill_id: 's1', level: 1 }], size: 'sm' });
    expect(document.querySelector('fieldset')).toHaveClass('fieldset-sm');
  });
});
