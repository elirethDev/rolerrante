<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { Wrench } from '@lucide/svelte';
  import { formatDate } from '$lib/utils';

  export let data: PageData;
</script>

<svelte:head><title>Cola de Habilidades — GM</title></svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3 mb-6"><Wrench /> Solicitudes de habilidad pendientes ({data.skillRequests.length})</h1>

{#if data.skillRequests.length === 0}
  <p class="text-gray-400">No hay solicitudes pendientes.</p>
{:else}
  <div class="space-y-4">
    {#each data.skillRequests as sr (sr.id)}
      {@const char = Array.isArray(sr.character) ? sr.character[0] : sr.character}
      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h3 class="font-cinzel text-lg text-azeroth-gold">{char?.name ?? 'Sin personaje'}</h3>
          <p class="text-sm text-gray-400">por {char?.player?.display_name ?? char?.player?.username ?? ''} · {formatDate(sr.created_at)}</p>
          <a href={resolve(`/gm/solicitudes/${sr.id}`)} class="btn btn-sm btn-outline mt-2 w-fit">Revisar solicitud</a>
        </div>
      </div>
    {/each}
  </div>
{/if}