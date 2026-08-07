<script lang="ts">
  import { statusLabel, formatDate } from '$lib/utils';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import SkillRequestForm from '$lib/components/skills/SkillRequestForm.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  const odBadge = (status: string): string => {
    switch (status) {
      case 'aprobado':
        return 'badge-success';
      case 'pendiente':
        return 'badge-blue';
      case 'rechazado':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };
</script>

<svelte:head>
  <title>Solicitudes de habilidad — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Solicitudes' }]} class="mb-2" />

<PageHeader
  kicker="Desarrollo del personaje"
  title="Solicitudes de habilidad"
  subtitle="Gastá puntos de experiencia (XP) para subir habilidades de tus fichas. El consejo revisa cada solicitud."
/>

<div class="solic-wrap">
  <SkillRequestForm characters={data.characters} form={form} />

  <section class="hist-section" aria-label="Historial de solicitudes">
    <div class="section-head">
      <h2>Historial</h2>
      <span class="meta">{data.requests.length} solicitudes</span>
    </div>
    {#if data.requests.length === 0}
      <EmptyState
        title="Sin solicitudes"
        description="No has enviado solicitudes todavía. Subí una habilidad para empezar."
      />
    {:else}
      {#each data.requests as req (req.id)}
        <div class="hist-row">
          <div class="h-top">
            <div>
              <div class="h-title">{req.character?.name ?? 'Personaje'} · {req.total_xp_cost} XP</div>
              <div class="h-meta">{formatDate(req.created_at)}</div>
            </div>
            <span class="badge {odBadge(req.status)} no-dot">{statusLabel(req.status)}</span>
          </div>
          {#if req.review_notes}
            <p class="h-note">Nota: {req.review_notes}</p>
          {/if}
        </div>
      {/each}
    {/if}
  </section>
</div>
