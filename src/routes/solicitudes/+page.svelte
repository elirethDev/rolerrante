<script lang="ts">
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import SkillRequestForm from '$lib/components/skills/SkillRequestForm.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Solicitudes de habilidad — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Solicitudes de habilidad</h1>

<div class="mb-6">
  <SkillRequestForm characters={data.characters} form={form} />
</div>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">Historial</h2>
    {#if data.requests.length === 0}
      <p class="text-gray-400">No has enviado solicitudes.</p>
    {:else}
      <div class="space-y-3">
        {#each data.requests as req}
          <div class="p-3 bg-base-100 rounded border border-azeroth-border">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold">{req.character?.name} · {req.total_xp_cost} XP</p>
                <p class="text-xs text-gray-400">{formatDate(req.created_at)}</p>
              </div>
              <span class="badge {statusColor(req.status)}">{statusLabel(req.status)}</span>
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
