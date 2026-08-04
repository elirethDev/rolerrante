<script lang="ts">
  import type { GmKpi } from './types';

  let { kpi }: { kpi: GmKpi } = $props();
</script>

<div data-testid="gm-analytics" class="grid grid-cols-2 md:grid-cols-4 gap-3">
  <div class="stat bg-base-200 border border-azeroth-border rounded-lg">
    <div class="stat-title">Pendientes</div>
    <div class="stat-value">{kpi.pendientes}</div>
  </div>
  <div class="stat bg-base-200 border border-azeroth-border rounded-lg">
    <div class="stat-title">Aprobadas hoy</div>
    <div class="stat-value">{kpi.aprobadasHoy}</div>
  </div>
  <div class="stat bg-base-200 border border-azeroth-border rounded-lg">
    <div class="stat-title">Tiempo medio</div>
    <div class="stat-value">{kpi.tiempoMedio}h</div>
  </div>
  <div class="stat bg-base-200 border border-azeroth-border rounded-lg">
    <div class="stat-title">Antigüedad &gt;48h</div>
    <div class="stat-value">{kpi.antiguedad48h}</div>
  </div>
</div>
