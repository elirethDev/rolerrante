<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { statusLabel, statusColor } from '$lib/utils';
  import { Plus } from '@lucide/svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import FilterTabs from '$lib/components/ui/FilterTabs.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let { data }: { data: PageData } = $props();

  let filter = $state('todas');

  const filtered = $derived(
    filter === 'todas'
      ? data.characters
      : data.characters.filter((c) => c.status === filter),
  );

  const counts = $derived({
    todas: data.characters.length,
    aprobado: data.characters.filter((c) => c.status === 'aprobado').length,
    pendiente: data.characters.filter((c) => c.status === 'pendiente').length,
    borrador: data.characters.filter((c) => c.status === 'borrador').length,
  });
</script>

<svelte:head>
  <title>Mis personajes — RolErrante</title>
</svelte:head>

<PageHeader
  kicker="Censo del reino"
  title="Mis personajes"
  subtitle="Presentá tus personajes al consejo. Las fichas aprobadas forman parte del canon del reino."
>
  {#snippet actions()}
    <a href={resolve('/personajes/nuevo')} class="btn btn-primary">
      <Plus size={18} /> Nueva ficha
    </a>
  {/snippet}
</PageHeader>

{#if data.characters.length === 0}
  <EmptyState
    title="Sin personajes"
    description="Creá tu primer personaje para empezar a rolear en el reino."
  >
    <a href={resolve('/personajes/nuevo')} class="btn btn-primary mt-4">Crear el primero</a>
  </EmptyState>
{:else}
  <FilterTabs
    ariaLabel="Filtrar fichas"
    value={filter}
    tabs={[
      { value: 'todas', label: 'Todas', count: counts.todas },
      { value: 'aprobado', label: 'Aprobadas', count: counts.aprobado },
      { value: 'pendiente', label: 'En revisión', count: counts.pendiente },
      { value: 'borrador', label: 'Borradores', count: counts.borrador },
    ]}
    onchange={(v) => (filter = v)}
  />

  {#if filtered.length === 0}
    <div class="empty-slot">
      <p>No hay fichas en este estado.</p>
    </div>
  {:else}
    <div class="char-grid">
      {#each filtered as char (char.id)}
        <a href={resolve(`/personajes/${char.id}`)} class="char-card">
          <div class="flex items-center justify-between gap-2">
            <span class="char-name" style="margin-bottom:4px">{char.name}</span>
            <span class="badge {statusColor(char.status)} badge-sm whitespace-nowrap">
              {statusLabel(char.status)}
            </span>
          </div>
          <span class="text-sm text-azeroth-muted">
            {char.race?.name ?? 'Sin raza'} · {char.age ?? '?'} años
          </span>
        </a>
      {/each}
    </div>
  {/if}
{/if}
