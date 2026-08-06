// Vitest alias target for SvelteKit's virtual module `$app/state`.
// `page` is a plain reactive-free object in unit tests; components read
// `page.status` / `page.error` which mutate freely without needing runes.
export const page: {
  status?: number;
  error?: { message?: string } | null;
} & Record<string, unknown> = {
  status: 404,
  error: null,
};