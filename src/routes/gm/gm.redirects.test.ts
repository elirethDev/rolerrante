import { describe, expect, it } from 'vitest';
import { load as fichasLoad } from './fichas/+page.server';
import { load as historiasLoad } from './historias/+page.server';
import { load as habilidadesLoad } from './habilidades/+page.server';
import { load as eventosLoad } from './eventos/+page.server';

// After consolidating on the unified /gm queue, the per-type list sub-pages
// were removed; any lingering link/bookmark must land on the unified panel.
describe('gm legacy sub-route redirects', () => {
  // The stubs ignore their Event args; cast to a bare loader so tests only
  // assert the redirect outcome, independent of SvelteKit's request types.
  const cases: { route: string; load: () => Promise<unknown> }[] = [
    { route: '/gm/fichas', load: fichasLoad as unknown as () => Promise<unknown> },
    { route: '/gm/historias', load: historiasLoad as unknown as () => Promise<unknown> },
    { route: '/gm/habilidades', load: habilidadesLoad as unknown as () => Promise<unknown> },
    { route: '/gm/eventos', load: eventosLoad as unknown as () => Promise<unknown> },
  ];

  it.each(cases)('$route redirects to the unified /gm panel', async ({ load }) => {
    await expect(load()).rejects.toMatchObject({ status: 307, location: '/gm' });
  });
});
