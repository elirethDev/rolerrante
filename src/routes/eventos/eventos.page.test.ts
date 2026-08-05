/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';

function props(over: any = {}) {
  return {
    data: {
      user: null,
      session: null,
      unreadCount: 0,
      events: [],
      profile: null,
      ...over,
    },
  };
}

describe('eventos/+page.svelte new-event action (EVT-PUB-03)', () => {
  it('shows the "Nuevo evento" link to an authenticated rolero', () => {
    const { unmount } = render(Page, props({ profile: { id: 'u1', role: 'rolero', username: 'mariela', display_name: null } }));
    const link = screen.getByRole('link', { name: /nuevo evento/i });
    expect(link).toHaveAttribute('href', '/eventos/nuevo');
    unmount();
  });

  it('shows the "Nuevo evento" link to gm and admin', () => {
    for (const role of ['gm', 'admin']) {
      const { unmount } = render(Page, props({ profile: { id: 'u1', role, username: 'staff', display_name: null } }));
      expect(screen.getByRole('link', { name: /nuevo evento/i })).toHaveAttribute('href', '/eventos/nuevo');
      unmount();
    }
  });

  it('hides the "Nuevo evento" link from a guest (no profile)', () => {
    const { unmount } = render(Page, props({ profile: null }));
    expect(screen.queryByRole('link', { name: /nuevo evento/i })).not.toBeInTheDocument();
    unmount();
  });
});
