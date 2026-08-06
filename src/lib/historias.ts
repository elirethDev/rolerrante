/**
 * Compartido del índice de historias: pestañas y utilidades de estado.
 * Vive fuera de +page.server.ts porque SvelteKit solo admite exports
 * de la API de página (load/actions/...) en ese módulo — STORY_TABS
 * exportado allí rompe la build de producción (Invalid export).
 */
export const STORY_TABS = ['todas', 'aprobadas', 'revision', 'borradores', 'mias'] as const;
export type StoryTab = (typeof STORY_TABS)[number];

export type StoryStatus = 'pendiente' | 'borrador' | 'aprobado' | 'rechazado';

/** Mapeo pestaña → status de DB (las que filtran por estado). */
export const STORY_STATUS: Partial<Record<StoryTab, StoryStatus>> = {
  aprobadas: 'aprobado',
  revision: 'pendiente',
  borradores: 'borrador',
};