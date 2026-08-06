<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { Plus, Search } from '@lucide/svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import FilterTabs from '$lib/components/ui/FilterTabs.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import CharacterCard from '$lib/components/characters/CharacterCard.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';

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

  <PageHeader
  kicker="Personajes"
  title="Censo del reino"
  subtitle="Las fichas aprobadas por el consejo, de todos los jugadores del reino. Busca por nombre o filtra por raza."
>
  {#snippet actions()}
    {#if data.profile}
      <a href={resolve('/personajes/nuevo')} class="btn btn-primary">
        <Plus size={18} /> Nueva ficha
      </a>
    {/if}
  {/snippet}
</PageHeader>

{#if data.characters.length === 0}
  <EmptyState
    title="Sin personajes en el censo"
    description="Todavía no hay fichas aprobadas por el consejo. Volvé a intentar con otra búsqueda o raza."
  >
    {#if data.profile}
      <a href={resolve('/personajes/nuevo')} class="btn btn-primary mt-4">Crear la primera</a>
    {/if}
  </EmptyState>
{:else}
  <form
    method="GET"
    action={resolve('/personajes')}
    bind:this={filterForm}
    class="mb-6 grid gap-3 md:grid-cols-[1fr_220px_auto]"
    role="search"
  >
    <div class="relative">
      <Search
        size={16}
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-azeroth-gold-dim"
        aria-hidden="true"
      />
      <input
        type="search"
        name="q"
        value={data.query}
        placeholder="Buscar personaje..."
        aria-label="Buscar personaje por nombre"
        class="azeroth-focus input w-full pl-9"
      />
    </div>
    <select
      name="race"
      value={data.race ?? ''}
      aria-label="Filtrar por raza"
      class="azeroth-focus min-h-10 w-full appearance-none rounded-lg border border-azeroth-border bg-azeroth-sunken py-2.5 pl-3 pr-9 font-sans text-sm text-base-content"
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
    <h2 class="mb-4 text-xl font-cinzel text-azeroth-gold">Mis fichas</h2>
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
    <div class="char-grid mt-4">
      {#each ownFiltered as char (char.id)}
        <CharacterCard {char} />
      {/each}
    </div>
  </section>
{/if}
