import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../../../src/routes/admin/usuarios/+page.svelte';

describe('admin/usuarios (REQ-AF-01, FS-01)', () => {
  it('keeps select-sm density with no fieldset wrapping (row layout)', () => {
    render(Page, {
      data: {
        users: [{ id: 'u1', username: 'pablo', display_name: 'Pablo', role: 'rolero' }],
      } as never,
      form: null as never,
    });

    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.className).toContain('select-sm');

    // row layout, no wrapping: zero fieldsets on the page
    expect(document.querySelectorAll('fieldset')).toHaveLength(0);
    expect(document.querySelectorAll('legend')).toHaveLength(0);
  });
});
