/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { ActionData, PageData } from './$types';
import Page from './+page.svelte';

const profile = {
  id: 'u1',
  username: 'pablo',
  display_name: 'Pablo',
  avatar_url: null,
  role: 'player',
};

function makeData(over: Record<string, unknown> = {}) {
  return {
    profile,
    kpis: { personajes: 3, cronicas: 2, eventos: 1, reputacion: 7 },
    actividad: [
      {
        id: 'story-s1',
        kind: 'crónica',
        label: 'Actualizaste la crónica «Los pasos del norte»',
        date: '2026-08-03T09:00:00Z',
        href: '/historias/s1',
      },
      {
        id: 'event-e1',
        kind: 'evento',
        label: 'Creaste el evento «Asedio a la ciudadela»',
        date: '2026-08-02T10:00:00Z',
        href: '/eventos/e1',
      },
    ],
    ...over,
  } as unknown as PageData;
}

describe('perfil page — rich profile (KPIs + activity + avatar affordance)', () => {
  it('renders the KPI grid with computed values', () => {
    const { container } = render(Page, {
      data: makeData(),
      form: {} as unknown as ActionData,
    });

    const stats = container.querySelectorAll('.stat');
    expect(stats.length).toBe(4);
    const values = Array.from(stats).map((s) => s.querySelector('.stat-value')?.textContent);
    expect(values).toEqual(['3', '2', '1', '7']);
    expect(container.textContent).toContain('Resumen del reino');
    expect(container.textContent).toContain('Reputación');
  });

  it('renders the activity feed with labels and links', () => {
    const { container } = render(Page, {
      data: makeData(),
      form: {} as unknown as ActionData,
    });

    const links = Array.from(container.querySelectorAll('a[href^="/"]'));
    expect(links.some((a) => a.getAttribute('href') === '/historias/s1')).toBe(true);
    expect(links.some((a) => a.getAttribute('href') === '/eventos/e1')).toBe(true);
    expect(container.textContent).toContain('Tu actividad');
    expect(container.textContent).toContain('Actualizaste la crónica');
  });

  it('renders the avatar file input on the page and keeps the identity form intact', () => {
    const { container } = render(Page, {
      data: makeData(),
      form: {} as unknown as ActionData,
    });

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput!.getAttribute('accept')).toBe('image/*');
    // identity Fields + the three change-password Fields (KPIs/feed add none)
    expect(container.querySelectorAll('fieldset')).toHaveLength(5);
  });

  it('renders an empty state when there is no activity', () => {
    const { container } = render(Page, {
      data: makeData({ actividad: [] }),
      form: {} as unknown as ActionData,
    });
    expect(container.textContent).toContain('Todavía no hay actividad registrada.');
  });

  it('renders the change-password section posting to ?/changePassword', () => {
    const { container } = render(Page, {
      data: makeData(),
      form: {} as unknown as ActionData,
    });

    expect(container.textContent).toContain('Cambiar contraseña');
    const pwdForm = Array.from(container.querySelectorAll('form')).find(
      (f) => f.getAttribute('action') === '?/changePassword',
    );
    expect(pwdForm).not.toBeUndefined();
    const inputs = Array.from(pwdForm!.querySelectorAll('input')).map((i) => i.getAttribute('name'));
    expect(inputs).toEqual(
      expect.arrayContaining(['current_password', 'new_password', 'confirm_password']),
    );
  });

  it('shows the change-password success message from the action response', () => {
    const { container } = render(Page, {
      data: makeData(),
      form: { success: true, message: 'Contraseña actualizada' } as unknown as ActionData,
    });
    expect(container.textContent).toContain('Contraseña actualizada');
  });
});
