<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { Plus, Search } from '@lucide/svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import FilterTabs from '$lib/components/ui/FilterTabs.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import CharacterCard from '$lib/components/characters/CharacterCard.svelte';

  let { data }: { data: PageData } = $props();

  let filterForm = $state<HTMLFormElement | null>(null);

  let ownFilter = $state('todas');

  const ownFiltered = $derived(
    ownFilter === 'todas'
      ? data.ownCharacters
      : data.ownCharacters.filter((c) => c.status === ownFilter),
  );

  const ownCounts = $derived({
    todas: data.ownCharacters.length,
    aprobado: data.ownCharacters.filter((c) => c.status === 'aprobado').length,
    pendiente: data.ownCharacters.filter((c) => c.status === 'pendiente').length,
    borrador: data.ownCharacters.filter((c) => c.status === 'borrador').length,
  });
</script>

<svelte:head>
  <title>Censo del reino — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Personajes' }]} class="mb-2" />

<header class="page-head" style="border-bottom:var(--border-faint)">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <span class="kicker">Personajes</span>
      <h1 class="page-title" style="margin-bottom:6px">Censo del reino</h1>
      <p class="page-sub">Las fichas aprobadas por el consejo, de todos los jugadores del reino. Busca por nombre o filtra por raza.</p>
    </div>
    {#if data.profile}
      <a href={resolve('/personajes/nuevo')} class="btn btn-primary btn-lg">
        <Plus size={18} /> Nueva ficha
      </a>
    {/if}
  </div>
</header>

{#if data.characters.length === 0}
  <EmptyState
    title="Sin personajes en el censo"
    description="Todavía no hay fichas aprobadas por el consejo. Volvé a intentar con otra búsqueda o raza."
  >
    {#if data.profile}
      <a href={resolve('/personajes/nuevo')} class="btn btn-primary">Crear la primera</a>
    {/if}
  </EmptyState>
{:else}
  <form
    method="GET"
    action={resolve('/personajes')}
    bind:this={filterForm}
    class="top-actions"
    role="search"
    aria-label="Buscar fichas del censo"
  >
    <div class="search-wrap">
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        name="q"
        value={data.query}
        placeholder="Buscar por nombre, raza o gremio..."
        aria-label="Buscar personaje por nombre"
        class="input"
      />
    </div>
    <select
      name="race"
      value={data.race ?? ''}
      aria-label="Filtrar por raza"
      class="input"
      style="max-width:220px"
      onchange={() => filterForm?.requestSubmit()}
    >
      <option value="">Todas las razas</option>
      {#each data.races as race (race.id)}
        <option value={race.id}>{race.name}</option>
      {/each}
    </select>
    <button type="submit" class="btn btn-secondary">
      <Search size={16} /> <span class="hidden sm:inline">Buscar</span>
    </button>
  </form>

  <div class="char-grid">
    {#each data.characters as char (char.id)}
      <CharacterCard {char} />
    {/each}
  </div>
{/if}

{#if data.profile && data.ownCharacters.length > 0}
  <section class="mt-10" data-testid="own-characters">
    <div class="flex items-end justify-between gap-4 flex-wrap" style="margin-bottom:var(--s-4)">
      <div>
        <span class="kicker">Censo del reino</span>
        <h2 class="page-title" style="font-size:1.15rem;margin:8px 0 0">Mis fichas</h2>
      </div>
    </div>
    <FilterTabs
      ariaLabel="Filtrar mis fichas"
      value={ownFilter}
      tabs={[
        { value: 'todas', label: 'Todas', count: ownCounts.todas },
        { value: 'aprobado', label: 'Aprobadas', count: ownCounts.aprobado },
        { value: 'pendiente', label: 'En revisión', count: ownCounts.pendiente },
        { value: 'borrador', label: 'Borradores', count: ownCounts.borrador },
      ]}
      onchange={(v) => (ownFilter = v)}
    />
    <div class="char-grid" style="margin-top:var(--s-4)">
      {#each ownFiltered as char (char.id)}
        <CharacterCard {char} />
      {/each}
    </div>
  </section>
{/if}
