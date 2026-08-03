import '@testing-library/jest-dom/vitest';

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
