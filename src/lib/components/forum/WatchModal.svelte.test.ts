import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import WatchModal from './WatchModal.svelte';

/** Read the FormData the preference form would POST by capturing its submit
 * event (the real SvelteKit action is not invoked in a component test). */
function capturePreferenceSubmit(form: HTMLFormElement) {
  let submitted: Record<string, FormDataEntryValue> | null = null;
  const listener = (e: Event) => {
    e.preventDefault();
    submitted = Object.fromEntries(new FormData(form).entries());
  };
  form.addEventListener('submit', listener);
  return {
    async fire() {
      await fireEvent.submit(form);
      form.removeEventListener('submit', listener);
      return submitted;
    },
  };
}

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
    expect(screen.queryByText('Seguir')).toBeNull();
  });

  it('checkbox reflects the loader notifyInApp value initially', () => {
    const { unmount } = render(WatchModal, {
      open: true, following: true, notifyInApp: true, guest: false, onClose: vi.fn(),
    });
    const toggle = screen.getByTestId('notify-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    unmount();

    render(WatchModal, {
      open: true, following: true, notifyInApp: false, guest: false, onClose: vi.fn(),
    });
    expect((screen.getByTestId('notify-toggle') as HTMLInputElement).checked).toBe(false);
  });

  it('submits notify_in_app=on on the preference form when the toggle is on (round-trip)', async () => {
    render(WatchModal, {
      open: true, following: true, notifyInApp: false, guest: false, onClose: vi.fn(),
    });
    const toggle = screen.getByTestId('notify-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    // Enable in-app notifications, then submit the preference form.
    await fireEvent.change(toggle, { target: { checked: true } });
    expect(toggle.checked).toBe(true);

    const form = (screen.getByTestId('save-pref') as HTMLButtonElement).closest('form') as HTMLFormElement;
    const submitted = await capturePreferenceSubmit(form).fire();
    expect(submitted).not.toBeNull();
    expect(submitted!.notify_in_app).toBe('on');
  });

  it('submits no notify_in_app on the preference form when the toggle is off (round-trip)', async () => {
    render(WatchModal, {
      open: true, following: true, notifyInApp: true, guest: false, onClose: vi.fn(),
    });
    const toggle = screen.getByTestId('notify-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    // Disable in-app notifications, then submit the preference form.
    await fireEvent.change(toggle, { target: { checked: false } });
    expect(toggle.checked).toBe(false);

    const form = (screen.getByTestId('save-pref') as HTMLButtonElement).closest('form') as HTMLFormElement;
    const submitted = await capturePreferenceSubmit(form).fire();
    expect(submitted!.notify_in_app).toBeUndefined();
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
