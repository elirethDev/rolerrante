import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../../../src/routes/admin/catalogos/+page.svelte';

describe('admin/catalogos (REQ-AF-01, FS-01/04)', () => {
  it('renders all form fields as Field size=sm with legible 13px legends', async () => {
    render(Page, {
      data: { races: [], skills: [] } as never,
      form: null as never,
    });

    // The race and skill forms are toggled behind buttons
    await fireEvent.click(screen.getByRole('button', { name: 'Nueva raza' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Nueva habilidad' }));

    const fieldsets = document.querySelectorAll('fieldset');
    expect(fieldsets.length).toBeGreaterThan(0);

    // every fieldset is a Field with sm density
    for (const fs of fieldsets) {
      expect(fs.className).toContain('fieldset-sm');
    }

    // every legend is legible 13px, no micro 11px text-xs remains
    const legends = document.querySelectorAll('legend');
    expect(legends.length).toBeGreaterThan(0);
    for (const legend of legends) {
      expect(legend.className).toContain('text-[13px]');
      expect(legend.className).not.toContain('text-xs');
    }

    // nested group legends (Datos físicos / Edad) are also sm
    const groupLegends = [...legends].filter((l) =>
      ['Datos físicos', 'Edad'].includes(l.textContent?.trim() ?? ''),
    );
    expect(groupLegends.length).toBe(2);
    for (const gl of groupLegends) {
      expect(gl.className).toContain('text-[13px]');
      expect((gl.closest('fieldset') as HTMLElement).className).toContain('fieldset-sm');
    }

    // no max-w constraint on admin container (REQ-FS-04 admin full-width)
    expect(document.querySelector('[class*="max-w"]')).toBeNull();
  });

  it('removes the horizontal label-row checkbox pattern (REQ-FS-02)', async () => {
    render(Page, {
      data: { races: [], skills: [] } as never,
      form: null as never,
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Nueva habilidad' }));

    const checkbox = document.querySelector('input[name="requires_specialization"]') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    // the checkbox control sits inside a Field: no sibling <label> row
    const wrapper = checkbox.closest('fieldset') as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.querySelector('legend')?.textContent).toContain('Requiere especialización');
    expect(document.querySelector('fieldset > label')).toBeNull();
  });
});
