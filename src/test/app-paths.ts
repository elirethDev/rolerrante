// Vitest alias target for SvelteKit's virtual module `$app/paths`.
// In unit tests the resolved paths are inert — the base path prefix is empty,
// so `resolve` is effectively an identity function on relative route paths.

export const resolve = (path: string): string => path;
