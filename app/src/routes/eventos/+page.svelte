<script lang="ts">
  import type { PageData } from './$types';
  import { statusLabel, statusColor, formatDateTime } from '$lib/utils';
  import { Calendar } from 'lucide-svelte';

  export let data: PageData;
</script>

<svelte:head>
  <title>Eventos — RolErrante</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3"><Calendar /> Eventos</h1>
  {#if data.profile?.role === 'gm' || data.profile?.role === 'admin'}
    <a href="/eventos/nuevo" class="btn btn-primary btn-sm font-cinzel">Nuevo evento</a>
  {/if}
</div>

{#if data.events.length === 0}
  <div class="text-center py-20 text-gray-400">
    <p>No hay eventos programados.</p>
  </div>
{:else}
  <div class="grid md:grid-cols-2 gap-6">
    {#each data.events as event}
      <a href="/eventos/{event.id}" class="card bg-base-200 border border-azeroth-border hover:border-azeroth-gold transition-colors">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <h2 class="card-title font-cinzel text-lg">{event.title}</h2>
            <span class="badge {statusColor(event.status)}">{statusLabel(event.status)}</span>
          </div>
          <p class="text-sm text-gray-400">{formatDateTime(event.starts_at)} · {event.type}</p>
          <p class="text-sm text-gray-400">Organiza: {event.creator?.display_name ?? event.creator?.username}</p>
        </div>
      </a>
    {/each}
  </div>
{/if}
