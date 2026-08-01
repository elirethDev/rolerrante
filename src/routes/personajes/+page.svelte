<script lang="ts">
  import type { PageData } from './$types';
  import { statusLabel, statusColor } from '$lib/utils';
  import { Users } from 'lucide-svelte';

  export let data: PageData;
</script>

<svelte:head>
  <title>Mis personajes — RolErrante</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3"><Users /> Mis personajes</h1>
  <a href="/personajes/nuevo" class="btn btn-primary btn-sm font-cinzel">Nuevo personaje</a>
</div>

{#if data.characters.length === 0}
  <div class="text-center py-20 text-gray-400">
    <p>No tienes personajes todavía.</p>
    <a href="/personajes/nuevo" class="btn btn-primary mt-4">Crear el primero</a>
  </div>
{:else}
  <div class="grid md:grid-cols-2 gap-6">
    {#each data.characters as char (char.id)}
      <a href="/personajes/{char.id}" class="card bg-base-200 border border-azeroth-border hover:border-azeroth-gold transition-colors">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <h2 class="card-title font-cinzel text-lg">{char.name}</h2>
            <span class="badge {statusColor(char.status)}">{statusLabel(char.status)}</span>
          </div>
          <p class="text-sm text-gray-400">{char.race?.name ?? ''} · {char.age ?? '?'} años</p>
        </div>
      </a>
    {/each}
  </div>
{/if}
