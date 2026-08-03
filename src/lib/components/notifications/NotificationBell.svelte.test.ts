import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NotificationBell from './NotificationBell.svelte';

describe('NotificationBell', () => {
  it('renders nothing for a guest (REQ-NOTIF-02: Guest no bell)', () => {
    render(NotificationBell, { unreadCount: 3, guest: true });
    expect(screen.queryByTestId('notification-bell')).toBeNull();
    expect(screen.queryByTestId('unread-badge')).toBeNull();
  });

  it('links to the notification center with an accessible label', () => {
    render(NotificationBell, { unreadCount: 0, guest: false });
    const bell = screen.getByTestId('notification-bell') as HTMLAnchorElement;
    expect(bell).toBeTruthy();
    expect(bell.getAttribute('href')).toBe('/notificaciones');
    expect(bell.getAttribute('aria-label')).toBe('Notificaciones');
  });

  it('shows the unread count badge when there are unread notifications (REQ-NOTIF-02: Unread badge)', () => {
    render(NotificationBell, { unreadCount: 5, guest: false });
    expect(screen.getByTestId('unread-badge').textContent).toBe('5');
    expect(screen.getByTestId('notification-bell').getAttribute('aria-label')).toBe(
      'Notificaciones (5 sin leer)',
    );
  });

  it('hides the badge when the user has zero unread notifications', () => {
    render(NotificationBell, { unreadCount: 0, guest: false });
    expect(screen.getByTestId('notification-bell')).toBeTruthy();
    expect(screen.queryByTestId('unread-badge')).toBeNull();
  });
});
