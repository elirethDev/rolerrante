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
  it('renders fieldset+legend instead of a horizontal label sibling row (REQ-GS-01)', () => {
    render(SkillPicker, { skills, mode: 'create' });
    // Level control is grouped in a fieldset with a legend, no sibling <label>
    expect(document.querySelectorAll('fieldset').length).toBeGreaterThan(0);
    expect(document.querySelector('fieldset legend')).toBeInTheDocument();
    expect(screen.getAllByText('Nivel').length).toBeGreaterThan(0);
    // zero <label> rendered as horizontal sibling rows
    expect(document.querySelectorAll('label')).toHaveLength(0);
  });

  it('renders specialization fieldset+legend when a skill requires spec', () => {
    render(SkillPicker, { skills, mode: 'create' });
    expect(screen.getByPlaceholderText('Especialización')).toBeInTheDocument();
    expect(document.querySelectorAll('fieldset').length).toBe(2);
  });

  it('applies sm fieldset density for GM/admin context and md by default (REQ-GS-01)', () => {
    const { unmount } = render(SkillPicker, { skills, size: 'sm' });
    expect(document.querySelector('fieldset')).toHaveClass('fieldset-sm');
    unmount();

    render(SkillPicker, { skills, size: 'md' });
    expect(document.querySelector('fieldset')).not.toHaveClass('fieldset-sm');
  });

  it('keeps the w-20 inline level stepper width (REQ-FS-05)', () => {
    render(SkillPicker, { skills, mode: 'create' });
    const levelInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(levelInput).not.toBeNull();
    expect(levelInput.classList).toContain('w-20');
  });
});
