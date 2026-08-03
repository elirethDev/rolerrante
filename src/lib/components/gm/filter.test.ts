import { describe, expect, it } from 'vitest';
import { applyFilter } from './filter';
import type { WorklistItem } from './types';

// Design AD-3: client-side array.filter() on type discriminator.
// Spec gm-worklist R2: chips Todas/Fichas/Eventos/Crónicas filter client-side.

const base = (over: Partial<WorklistItem> = {}): WorklistItem => ({
  id: '1',
  type: 'ficha',
  name: 'N',
  author: 'A',
  createdAt: '2026-01-01T00:00:00Z',
  stale: false,
  detailHref: '/fichas/1',
  entityId: '1',
  ...over,
});

describe('applyFilter', () => {
  const items = [
    base({ id: 'a', type: 'ficha', name: 'Ficha A' }),
    base({ id: 'b', type: 'evento', name: 'Evento B' }),
    base({ id: 'c', type: 'cronica', name: 'Crónica C' }),
    base({ id: 'd', type: 'solicitud', name: 'Solicitud D' }),
  ];

  it('todas returns every pending item unchanged', () => {
    expect(applyFilter(items, 'todas')).toHaveLength(4);
  });

  it('ficha narrows to ficha-type items only', () => {
    const out = applyFilter(items, 'ficha');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
  });

  it('evento narrows to evento-type items only', () => {
    expect(applyFilter(items, 'evento').map((i) => i.id)).toEqual(['b']);
  });

  it('cronica excludes solicitud and other types', () => {
    expect(applyFilter(items, 'cronica').map((i) => i.id)).toEqual(['c']);
  });

  it('a specific filter over an empty list stays empty', () => {
    expect(applyFilter([], 'ficha')).toHaveLength(0);
  });
});
