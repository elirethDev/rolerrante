// Vitest alias target for SvelteKit's virtual module `$app/navigation`.
// In unit tests `goto` is a no-op — page wiring tests mock it via vi.mock when
// they need to assert navigation.
export const goto = (): void => {};
export const invalidateAll = (): void => {};
