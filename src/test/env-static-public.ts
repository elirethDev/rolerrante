// Vitest alias target for SvelteKit's virtual module `$env/static/public`
// (see resolve.alias in vitest.config.ts). Values are inert in tests —
// server.ts only passes them to createServerClient, which is mocked.

export const PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
export const PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
