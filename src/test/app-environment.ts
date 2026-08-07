// Vitest alias target for SvelteKit's virtual module `$app/environment`.
// Unit tests run in jsdom (browser-like); they are never in dev/build mode.
export const dev = false;
export const browser = true;
export const building = false;
