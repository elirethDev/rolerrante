import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SkillPicker from './SkillPicker.svelte';

const skills = [
  {
    id: 'a1',
    name: 'Ataque',
    attribute: 'F',
    requires_specialization: false,
  },
  {
    id: 'a2',
    name: 'Puntería',
    attribute: 'D',
    requires_specialization: true,
  },
];

describe('SkillPicker', () => {
  it('groups controls in .field with label inside skill-row (REQ-GS-01)', () => {
    render(SkillPicker, { skills, mode: 'create' });
    // level control is grouped in a .field with a label, one per skill row
    expect(document.querySelectorAll('.skill-group').length).toBe(2);
    expect(document.querySelector('.skill-group-head h3')?.textContent).toContain('F');
    expect(document.querySelectorAll('.s-up').length).toBe(2);
    expect(document.querySelector('.s-up label')).toHaveTextContent('Nivel');
    expect(screen.getAllByText('Nivel').length).toBeGreaterThan(0);
    // controls are .input elements wired to the skill level name
    const levelInput = document.querySelector('.s-up input') as HTMLInputElement;
    expect(levelInput).not.toBeNull();
    expect(levelInput.classList).toContain('input');
    expect(levelInput.name).toContain('skill_level_');
  });

  it('renders an Especialización field only when a skill requires spec', () => {
    render(SkillPicker, { skills, mode: 'create' });
    const specInput = screen.getByPlaceholderText('Especialización') as HTMLInputElement;
    expect(specInput).toBeInTheDocument();
    expect(specInput.classList).toContain('input');
    // only Puntería (requires_specialization) gets the spec field
    expect(document.querySelectorAll('.s-spec').length).toBe(1);
  });

  it('applies sm field density for GM/admin context and md by default (REQ-GS-01)', () => {
    const { unmount } = render(SkillPicker, { skills, size: 'sm' });
    expect(document.querySelector('.s-up')).toHaveClass('field-sm');
    unmount();

    render(SkillPicker, { skills, size: 'md' });
    expect(document.querySelector('.s-up')).not.toHaveClass('field-sm');
  });

  it('renders a narrow inline level stepper (REQ-FS-05)', () => {
    render(SkillPicker, { skills, mode: 'create' });
    const levelInput = document.querySelector('.s-up input') as HTMLInputElement;
    expect(levelInput).not.toBeNull();
    expect(levelInput.type).toBe('number');
    expect(levelInput.name).toContain('skill_level_');
    expect(levelInput.closest('.skill-row')).toBeInTheDocument();
  });
});
