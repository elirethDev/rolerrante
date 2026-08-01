<script lang="ts">
  import type { PageData } from './$types';
  import { Calendar } from 'lucide-svelte';
  import EventCard from '$lib/components/events/EventCard.svelte';

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
    {#each data.events as event (event.id)}
      <EventCard {event} />
    {/each}
  </div>
{/if}
