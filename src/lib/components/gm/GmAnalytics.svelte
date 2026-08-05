<script lang="ts">
  import type { GmKpi } from './types';

  let { kpi }: { kpi: GmKpi } = $props();
</script>

<div data-testid="gm-analytics" class="kpi-grid">
  <div class="kpi"><span class="kpi-num">{kpi.pendientes}</span><span class="kpi-label">Pendientes</span></div>
  <div class="kpi"><span class="kpi-num">{kpi.aprobadasHoy}</span><span class="kpi-label">Aprobadas hoy</span></div>
  <div class="kpi"><span class="kpi-num">{kpi.tiempoMedio}h</span><span class="kpi-label">Tiempo medio</span></div>
  <div class="kpi"><span class="kpi-num">{kpi.antiguedad48h}</span><span class="kpi-label">Antigüedad &gt;48h</span></div>
</div>
