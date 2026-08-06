<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { Plus, Search } from '@lucide/svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import FilterTabs from '$lib/components/ui/FilterTabs.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { formatDateTime, statusColor, statusLabel } from '$lib/utils';

  let { data }: { data: PageData } = $props();

  let filter = $state('todos');
  let query = $state('');
  let tipo = $state('todos');

  const TYPE_OPTIONS = [
    { value: 'todos', label: 'Todos los tipos' },
    { value: 'casual', label: 'Casual' },
    { value: 'evento', label: 'Evento' },
    { value: 'campana', label: 'Campaña' },
  ];

  const counts = $derived({
    todos: data.events.length,
    publicado: data.events.filter((e) => e.status === 'publicado').length,
    en_curso: data.events.filter((e) => e.status === 'en_curso').length,
    finalizado: data.events.filter((e) => e.status === 'finalizado').length,
  });

  /** Day+month chip from starts_at (OD eventos.html:89 event-date block). */
  function eventChip(iso: string | null | undefined) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const m = d.toLocaleDateString('es-ES', { month: 'short' });
    return {
      day: String(d.getDate()),
      month: m.charAt(0).toUpperCase() + m.slice(1, 3),
    };
  }

  const events = $derived(
    data.events.map((e) => {
      const chip = eventChip(e.starts_at);
      return { ...e, chipDay: chip?.day ?? null, chipMonth: chip?.month ?? null };
    }),
  );

  const filtered = $derived(
    events.filter((e) => {
      const statusOk = filter === 'todos' || e.status === filter;
      const tipoOk = tipo === 'todos' || e.type === tipo;
      const q = query.trim().toLowerCase();
      const queryOk =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q) ||
        (e.type ?? '').toLowerCase().includes(q);
      return statusOk && tipoOk && queryOk;
    }),
  );

  const canCreate = $derived(Boolean(data.profile));
</script>

<svelte:head>
  <title>Eventos — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Eventos' }]} class="mb-2" />

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
    <label class="sr-only" for="evento-tipo">Filtrar por tipo</label>
    <select
      id="evento-tipo"
      data-testid="tipo-select"
      class="input"
      aria-label="Filtrar por tipo"
      bind:value={tipo}
    >
      {#each TYPE_OPTIONS as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
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
            {#if event.chipDay}
              <div class="event-date shrink-0" data-testid="event-chip" aria-hidden="true">
                <b>{event.chipDay}</b>
                <span>{event.chipMonth}</span>
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <h3 class="media-title">{event.title}</h3>
              {#if event.status}
                <div>
                  <span class="badge {statusColor(event.status)} badge-sm whitespace-nowrap">
                    {statusLabel(event.status)}
                  </span>
                </div>
              {/if}
            </div>
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
