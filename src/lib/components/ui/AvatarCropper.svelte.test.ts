/* eslint-disable no-unused-vars -- cropperjs mock types intentionally loose */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import AvatarCropper from './AvatarCropper.svelte';

// The component wraps `cropperjs` (v1.6.2). We mock the library so the wrapper
// contract is testable in jsdom without real image/canvas decoding (the pure
// byte-level validation is covered separately in tests/avatars.test.ts).
vi.mock('cropperjs', () => {
  class MockCropper {
    static instances: MockCropper[] = [];
    zoomCalls: number[] = [];
    constructor(_element: unknown, public options: Record<string, unknown>) {
      MockCropper.instances.push(this);
    }
    destroy() {}
    zoom(delta: number) {
      this.zoomCalls.push(delta);
    }
  }
  (MockCropper as unknown as { instances: MockCropper[] }).instances = [];
  return { default: MockCropper };
});

import Cropper from 'cropperjs';
const MockCropper = Cropper as unknown as {
  instances: Array<{ zoomCalls: number[]; options: Record<string, unknown> }>;
};

const fakeCanvas = () => ({
  toBlob(cb: (blob: Blob | null) => void) {
    cb(new Blob([new Uint8Array(10)], { type: 'image/webp' }));
  },
});

function lastInstance() {
  const arr = MockCropper.instances;
  return arr[arr.length - 1];
}

describe('AvatarCropper (REQ-AVUP-01 / REQ-AVUP-02)', () => {
  it('renders the source image and confirm/cancel controls', () => {
    render(AvatarCropper, { src: 'blob:avatar-1' });

    const img = screen.getByTestId('cropper-img');
    expect(img).toHaveAttribute('src', 'blob:avatar-1');
    expect(screen.getByRole('button', { name: 'Confirmar recorte' })).toBeInTheDocument();
  });

  it('creates a Cropper instance with a fixed 1:1 aspect ratio', async () => {
    render(AvatarCropper, { src: 'blob:avatar-1' });
    await Promise.resolve();

    expect(MockCropper.instances.length).toBeGreaterThanOrEqual(1);
    expect(lastInstance().options.aspectRatio).toBe(1);
  });

  it('zooms the cropper when the zoom buttons are pressed', async () => {
    render(AvatarCropper, { src: 'blob:avatar-1' });
    await Promise.resolve();

    const zoomIn = screen.getByRole('button', { name: 'Acercar' });
    const zoomOut = screen.getByRole('button', { name: 'Alejar' });
    await fireEvent.click(zoomIn);
    await fireEvent.click(zoomOut);

    expect(lastInstance().zoomCalls).toEqual([0.1, -0.1]);
  });

  it('emits a WebP File named avatar.webp on confirm (REQ-AVUP-02)', async () => {
    vi.useFakeTimers();
    const onavatarfile = vi.fn();
    render(AvatarCropper, { src: 'blob:avatar-1', onavatarfile });
    await Promise.resolve();

    // Stub getCroppedCanvas on the live instance so we don't touch real canvas.
    (lastInstance() as unknown as { getCroppedCanvas: (...a: unknown[]) => unknown }).getCroppedCanvas = () =>
      fakeCanvas();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar recorte' }));
    await vi.runAllTimersAsync();

    expect(onavatarfile).toHaveBeenCalledTimes(1);
    const file = onavatarfile.mock.calls[0][0] as File;
    expect(file.name).toBe('avatar.webp');
    expect(file.type).toBe('image/webp');
    vi.useRealTimers();
  });

  it('stays silent when confirm is pressed with no cropper', async () => {
    const onavatarfile = vi.fn();
    render(AvatarCropper, { src: '', onavatarfile });
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar recorte' }));

    expect(onavatarfile).not.toHaveBeenCalled();
  });
});
