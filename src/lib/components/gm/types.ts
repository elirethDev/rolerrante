/** GM worklist domain types (design Interfaces / Contracts). */

export type WorklistItemType = 'ficha' | 'evento' | 'cronica' | 'solicitud';

/** Human labels for the worklist type tags (design gm.html `[data-type]` tags). */
export const TYPE_LABELS: Record<WorklistItemType, string> = {
  ficha: 'Ficha',
  evento: 'Evento',
  cronica: 'Crónica',
  solicitud: 'Solicitud',
};

/** A single row of the unified GM pending queue (design `WorklistItem`). */
export interface WorklistItem {
  id: string;
  type: WorklistItemType;
  name: string;
  author: string;
  createdAt: string;
  stale: boolean;
  detailHref: string;
  entityId: string;
}

/** Client-side filter keys (design AD-3: Todas/Fichas/Eventos/Crónicas). */
export type FilterKey = 'todas' | 'ficha' | 'evento' | 'cronica';

export const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'ficha', label: 'Fichas' },
  { key: 'evento', label: 'Eventos' },
  { key: 'cronica', label: 'Crónicas' },
];

/** KPI grid values (design `GmKpi`). */
export interface GmKpi {
  pendientes: number;
  aprobadasHoy: number;
  tiempoMedio: number;
  antiguedad48h: number;
}
