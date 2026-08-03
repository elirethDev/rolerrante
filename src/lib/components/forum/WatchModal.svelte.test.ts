import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import WatchModal from './WatchModal.svelte';

describe('WatchModal', () => {
  it('renders nothing for a guest', () => {
    render(WatchModal, { open: true, following: false, guest: true, onClose: vi.fn() });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Seguir')).toBeNull();
  });

  it('shows the Seguir button when the user is not following', () => {
    render(WatchModal, { open: true, following: false, guest: false, onClose: vi.fn() });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Seguir')).toBeTruthy();
    expect(screen.queryByText('Dejar de seguir')).toBeNull();
  });

  it('shows Dejar de seguir plus the in-app toggle when following', () => {
    render(WatchModal, { open: true, following: true, notifyInApp: true, guest: false, onClose: vi.fn() });
    expect(screen.getByText('Dejar de seguir')).toBeTruthy();
    const toggle = screen.getByTestId('notify-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(screen.queryByText('Seguir')).toBeNull();
  });

  it('renders nothing when closed', () => {
    render(WatchModal, { open: false, following: false, guest: false, onClose: vi.fn() });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes via Escape key', async () => {
    const onClose = vi.fn();
    render(WatchModal, { open: true, following: false, guest: false, onClose });
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
