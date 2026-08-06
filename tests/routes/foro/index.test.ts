import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Page from '../../../src/routes/foro/+page.svelte';

// TipTapEditor mounts an EditingView on mount; stub it so opening the quick-create
// modal renders in jsdom without editor lifecycle flakiness.
vi.mock('$lib/components/editor/TipTapEditor.svelte', () => ({
  default: () => '<div data-testid="tiptap-editor" />',
}));

const node = (id: string, name: string, p: Partial<Record<string, unknown>> = {}) => ({
  id,
  name,
  description: null,
  is_visible: true,
  min_read_role: null,
  requires_approval: false,
  flags: { can_view: true, can_post: true, can_edit: false, can_lock: false },
  children: [],
  threads: [],
  threads_count: 0,
  posts_count: 0,
  ...p,
});

function renderPage(over: Record<string, unknown> = {}) {
  const data = {
    isSearch: false,
    query: '',
    searchResults: [],
    roleLabel: 'rolero',
    isAdmin: false,
    isStaff: false,
    categories: [node('c1', 'Salón General')],
    ...over,
  };
  return render(Page, { data: data as never });
}

describe('/foro index — notice banner (OD alignment)', () => {
  it('shows a public notice banner above the search box', () => {
    renderPage();
    expect(screen.getByTestId('foro-notice')).toBeInTheDocument();
    expect(screen.getByText(/lectura/i)).toBeInTheDocument();
  });
});

describe('/foro index — Ayuda de la plaza modal (OD alignment)', () => {
  it('opens the help modal from the Ayuda button', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Ayuda/i }));
    expect(screen.getByRole('dialog', { name: /Ayuda de la plaza/i })).toBeInTheDocument();
  });

  it('shows report rules inside the help modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Ayuda/i }));
    expect(screen.getByText(/reportar/i)).toBeInTheDocument();
  });
});

describe('/foro index — quick new-thread modal (OD alignment)', () => {
  it('opens the quick-create modal from the primary Nuevo debate button', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Nuevo debate/i }));
    expect(screen.getByRole('dialog', { name: /Nuevo debate/i })).toBeInTheDocument();
  });

  it('quick-create modal posts to ?/quickCreate with title, section and allow-replies defaulted on', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Nuevo debate/i }));
    const form = screen.getByTestId('quick-create-form');
    expect(form).toHaveAttribute('action', '?/quickCreate');
    expect(form.querySelector('input[name="title"]')).not.toBeNull();
    expect(form.querySelector('select[name="category_id"]')).not.toBeNull();
    const allowReplies = form.querySelector('input[name="allow_replies"]') as HTMLInputElement;
    expect(allowReplies).not.toBeNull();
    expect(allowReplies.checked).toBe(true);
  });

  it('shows the Fijar checkbox only to staff', async () => {
    const user = userEvent.setup();
    renderPage({ isStaff: true });
    await user.click(screen.getByRole('button', { name: /Nuevo debate/i }));
    expect(screen.getByTestId('quick-create-form').querySelector('input[name="is_sticky"]')).not.toBeNull();
  });

  it('hides the Fijar checkbox for non-staff', async () => {
    const user = userEvent.setup();
    renderPage({ isStaff: false });
    await user.click(screen.getByRole('button', { name: /Nuevo debate/i }));
    expect(screen.getByTestId('quick-create-form').querySelector('input[name="is_sticky"]')).toBeNull();
  });

  it('keeps the full editor as a secondary route link inside the modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Nuevo debate/i }));
    expect(screen.getByRole('link', { name: /editor completo/i })).toHaveAttribute('href', '/foro/nuevo');
  });
});
