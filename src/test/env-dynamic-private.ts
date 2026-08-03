// Vitest alias target for SvelteKit's virtual module `$env/dynamic/private`
// (see resolve.alias in vitest.config.ts). SvelteKit provides a real Proxy
// namespace at runtime; tests that need to toggle the value override it with
// their own Proxy via vi.mock('$env/dynamic/private', ...). This inert module
// only lets the import resolve in the vitest graph.
export const SUPABASE_SERVICE_ROLE_KEY: string | undefined = undefined;
