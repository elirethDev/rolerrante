import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';

type Profile = { id: string; role: string; username: string; display_name: string | null };

function props(profile: Profile | null, events: unknown[] = []) {
  return { data: { events, profile } };
}

describe('eventos/+page.svelte new-event action (EVT-PUB-03)', () => {
  it('shows the "Nuevo evento" link to an authenticated rolero', () => {
    const { unmount } = render(Page, props({ id: 'u1', role: 'rolero', username: 'mariela', display_name: null }));
    const link = screen.getByRole('link', { name: /nuevo evento/i });
    expect(link).toHaveAttribute('href', '/eventos/nuevo');
    unmount();
  });

  it('shows the "Nuevo evento" link to gm and admin', () => {
    for (const role of ['gm', 'admin']) {
      const { unmount } = render(Page, props({ id: 'u1', role, username: 'staff', display_name: null }));
      expect(screen.getByRole('link', { name: /nuevo evento/i })).toHaveAttribute('href', '/eventos/nuevo');
      unmount();
    }
  });

  it('hides the "Nuevo evento" link from a guest (no profile)', () => {
    const { unmount } = render(Page, props(null));
    expect(screen.queryByRole('link', { name: /nuevo evento/i })).not.toBeInTheDocument();
    unmount();
  });
});
