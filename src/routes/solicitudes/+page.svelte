<script lang="ts">
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import { History, Sparkles } from '@lucide/svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import SkillRequestForm from '$lib/components/skills/SkillRequestForm.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Solicitudes de habilidad — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Solicitudes' }]} class="mb-2" />

<PageHeader
  kicker="Crecimiento del personaje"
  title="Solicitudes de habilidad"
  subtitle="Gastá puntos de repetición (XP) para subir habilidades de tus fichas. El consejo revisa cada solicitud."
/>

<div class="max-w-4xl">
  <div class="mb-8">
    <SkillRequestForm characters={data.characters} form={form} />
  </div>

  <div class="panel">
    <div class="panel-head">
      <History size={18} />
      <h2>Historial</h2>
      <span class="meta">{data.requests.length} solicitudes</span>
    </div>
    <div class="panel-body py-3">
      {#if data.requests.length === 0}
        <EmptyState
          title="Sin solicitudes"
          description="No has enviado solicitudes todavía. Subí una habilidad para empezar."
        />
      {:else}
        <div class="space-y-2">
          {#each data.requests as req (req.id)}
            <div class="rounded-lg border border-azeroth-border bg-azeroth-sunken p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-azeroth-text-high flex items-center gap-2">
                    <Sparkles size={16} class="text-azeroth-gold-dim" />
                    {req.character?.name ?? 'Personaje'} · {req.total_xp_cost} XP
                  </p>
                  <p class="text-xs text-azeroth-muted mt-0.5">{formatDate(req.created_at)}</p>
                </div>
                <span class="badge {statusColor(req.status)} badge-sm whitespace-nowrap">
                  {statusLabel(req.status)}
                </span>
              </div>
              {#if req.review_notes}
                <p class="text-sm mt-2 text-warning">Nota: {req.review_notes}</p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
