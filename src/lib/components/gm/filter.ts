import type { FilterKey, WorklistItem } from './types';

/**
 * Client-side filter by type discriminator (design AD-3 / spec gm-worklist R2).
 * `todas` returns the queue unchanged; any specific key keeps only matching types
 * (e.g. `cronica` also drops `solicitud`, which has no chip of its own).
 */
export function applyFilter(items: WorklistItem[], filter: FilterKey): WorklistItem[] {
  if (filter === 'todas') return items;
  return items.filter((item) => item.type === filter);
}
