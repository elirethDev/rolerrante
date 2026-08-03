import { writable } from 'svelte/store';

export type ToastKind = 'success' | 'danger' | 'gold';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export const toasts = writable<ToastItem[]>([]);

const AUTO_DISMISS_MS = 3400;

let nextId = 1;

export function toast(message: string, kind: ToastKind = 'gold', durationMs = AUTO_DISMISS_MS): void {
  const id = nextId++;
  toasts.update((list) => [...list, { id, kind, message }]);
  setTimeout(() => dismiss(id), durationMs);
}

export function dismiss(id: number): void {
  toasts.update((list) => list.filter((item) => item.id !== id));
}
