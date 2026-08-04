import '@testing-library/jest-dom/vitest';

// Manual @testing-library/svelte cleanup: we disable the plugin's autoCleanup
// (svelteTesting({ autoCleanup: false })) so its injected setup path — which
// resolves through the junction-linked node_modules to an /@fs/ URL outside the
// project root — does not break the test runner in git-worktree checkouts.
import { act, cleanup, setup } from '@testing-library/svelte';
import { afterEach, beforeEach } from 'vitest';

beforeEach(async () => {
  await setup();
});

afterEach(async () => {
  await act();
  cleanup();
});

// This Node/jsdom setup does not expose localStorage (Node's experimental
// webstorage requires --localstorage-file). Provide an in-memory localStorage so
// forum autosave tests (REQ-FC-02/05) can exercise save/restore/clear lifecycle.
const storageStore = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (k) => (storageStore.has(k) ? storageStore.get(k)! : null),
  setItem: (k, v) => {
    storageStore.set(k, String(v));
  },
  removeItem: (k) => {
    storageStore.delete(k);
  },
  clear: () => storageStore.clear(),
  key: () => null,
  get length() {
    return storageStore.size;
  },
} as Storage;

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
