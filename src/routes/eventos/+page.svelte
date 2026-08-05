<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { Plus, Search } from '@lucide/svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import FilterTabs from '$lib/components/ui/FilterTabs.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { formatDateTime, statusColor, statusLabel } from '$lib/utils';

  let { data }: { data: PageData } = $props();

  let filter = $state('todos');
  let query = $state('');

  const counts = $derived({
    todos: data.events.length,
    publicado: data.events.filter((e) => e.status === 'publicado').length,
    en_curso: data.events.filter((e) => e.status === 'en_curso').length,
    finalizado: data.events.filter((e) => e.status === 'finalizado').length,
  });

  const filtered = $derived(
    data.events.filter((e) => {
      const statusOk = filter === 'todos' || e.status === filter;
      const q = query.trim().toLowerCase();
      const queryOk =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q) ||
        (e.type ?? '').toLowerCase().includes(q);
      return statusOk && queryOk;
    }),
  );

  const canCreate = $derived(data.profile?.role === 'gm' || data.profile?.role === 'admin');
</script>

<svelte:head>
  <title>Eventos — RolErrante</title>
</svelte:head>

<PageHeader
  kicker="Agenda del reino"
  title="Eventos"
  subtitle="Encuentros, campañas y veladas organizadas por el consejo y la comunidad."
>
  {#snippet actions()}
    {#if canCreate}
      <a href={resolve('/eventos/nuevo')} class="btn btn-primary">
        <Plus size={18} /> Nuevo evento
      </a>
    {/if}
  {/snippet}
</PageHeader>

{#if data.events.length === 0}
  <EmptyState
    title="Sin eventos"
    description="No hay eventos publicados en la agenda del reino todavía."
  />
{:else}
  <FilterTabs
    ariaLabel="Filtrar eventos"
    value={filter}
    tabs={[
      { value: 'todos', label: 'Todos', count: counts.todos },
      { value: 'publicado', label: 'Próximos', count: counts.publicado },
      { value: 'en_curso', label: 'En curso', count: counts.en_curso },
      { value: 'finalizado', label: 'Finalizados', count: counts.finalizado },
    ]}
    onchange={(v) => (filter = v)}
  />

  <div class="top-actions">
    <div class="search-wrap">
      <Search aria-hidden="true" />
      <input
        class="input"
        type="search"
        placeholder="Buscar por título, ubicación o tipo..."
        bind:value={query}
      />
    </div>
  </div>

  {#if filtered.length === 0}
    <div class="empty-slot">
      <p>No hay eventos con ese filtro.</p>
    </div>
  {:else}
    <div class="grid gap-4 md:grid-cols-2">
      {#each filtered as event (event.id)}
        <a href={resolve(`/eventos/${event.id}`)} class="media-card">
          <div class="flex items-start justify-between gap-2">
            <h3 class="media-title">{event.title}</h3>
            {#if event.status}
              <span class="badge {statusColor(event.status)} badge-sm whitespace-nowrap">
                {statusLabel(event.status)}
              </span>
            {/if}
          </div>
          <p class="text-sm text-azeroth-muted">
            {formatDateTime(event.starts_at)}
            {#if event.type} · {event.type}{/if}
            {#if event.location} · {event.location}{/if}
          </p>
          {#if event.creator}
            <div class="media-foot">
              <span class="who">Organiza: {event.creator.display_name ?? event.creator.username}</span>
            </div>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
{/if}
