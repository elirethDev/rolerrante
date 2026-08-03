/* eslint-disable @typescript-eslint/no-explicit-any, no-unused-vars -- test props intentionally loose */
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Moderacion from '../../../src/routes/admin/moderacion/+page.svelte';

type Author = { id: string; display_name: string | null; username: string; role: string };

const author = (role = 'rolero'): Author => ({
  id: 'author-1',
  display_name: 'Frodo',
  username: 'frodo',
  role,
});

const report = (over: Record<string, unknown> = {}) => ({
  id: 'rep-1',
  reason: 'Spam',
  justification: null,
  status: 'abierta',
  created_at: '2026-08-03T00:00:00Z',
  reporter: { id: 'reporter-1', display_name: 'Reportero', username: 'rep' },
  post: { id: 'p1', thread_id: 't1', post_number: 2, author: author() },
  ...over,
});

const makeData = (over: Record<string, unknown> = {}) => ({
  pendingThreads: [],
  eventThreads: [],
  reports: [report()],
  sanctions: {},
  isAdmin: true,
  ...over,
});

const renderPage = (data: Record<string, unknown>) =>
  render(Moderacion as any, { data: data as any, form: null });

describe('admin/moderacion enforcement UI (REQ-MOD-ENF-01/02/04)', () => {
  it('hides all report actions for a non-admin (GM sees a read-only queue)', () => {
    renderPage(makeData({ isAdmin: false }));
    expect(screen.queryByText('Suspender')).not.toBeInTheDocument();
    expect(screen.queryByText('Banear')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolver')).not.toBeInTheDocument();
    expect(screen.queryByText('Descartar')).not.toBeInTheDocument();
  });

  it('shows suspend/ban controls for an admin on a normal rolero target', () => {
    renderPage(makeData());
    expect(screen.getByText('Suspender')).toBeInTheDocument();
    expect(screen.getByText('Banear')).toBeInTheDocument();
  });

  it('does not offer suspend/ban for a protected GM target (ENF-04)', () => {
    renderPage(
      makeData({
        reports: [
          report({
            post: { id: 'p1', thread_id: 't1', post_number: 2, author: author('gm') },
          }),
        ],
      }),
    );
    expect(screen.queryByText('Suspender')).not.toBeInTheDocument();
    expect(screen.queryByText('Banear')).not.toBeInTheDocument();
  });

  it('shows a sanction badge for a reported user under an active sanction', () => {
    renderPage(makeData({ sanctions: { 'author-1': { kind: 'ban', active_until: null } } }));
    expect(screen.getByText('Baneado')).toBeInTheDocument();
  });

  it('shows a suspension badge kind for an active suspension', () => {
    renderPage(
      makeData({
        sanctions: { 'author-1': { kind: 'suspension', active_until: '2099-01-01T00:00:00Z' } },
      }),
    );
    expect(screen.getByText('Suspendido')).toBeInTheDocument();
  });

  it('requires a dedicated inline confirm (ban) with a mandatory justification', async () => {
    renderPage(makeData());
    await fireEvent.click(screen.getByText('Banear'));
    // The inline confirm form replaces the trigger; its justification is required.
    const confirmBtn = screen.getByText('Confirmar baneo');
    const form = confirmBtn.closest('form') as HTMLFormElement;
    expect(form).toBeTruthy();
    const justif = form.querySelector('input[name="justification"]') as HTMLInputElement;
    expect(justif).toHaveAttribute('required');
    expect(form.querySelector('input[name="userId"]')?.getAttribute('value')).toBe('author-1');
  });

  it('dedicated inline confirm for suspend includes a duration select', async () => {
    renderPage(makeData());
    await fireEvent.click(screen.getByText('Suspender'));
    const confirmBtn = screen.getByText('Confirmar suspensión');
    const form = confirmBtn.closest('form') as HTMLFormElement;
    expect(form).toBeTruthy();
    expect(form.querySelector('select[name="duration"]')).toBeTruthy();
    expect(form.querySelector('input[name="justification"]')).toHaveAttribute('required');
  });
});
