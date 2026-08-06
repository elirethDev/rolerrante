<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import type { PageData } from './$types';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import { Search, Scroll, X } from '@lucide/svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import FilterTabs from '$lib/components/ui/FilterTabs.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Avatar from '$lib/components/ui/Avatar.svelte';

  let { data }: { data: PageData } = $props();

  const filter = $derived(data.tab);
  const counts = $derived(data.counts);

  const playerName = (p: unknown): string =>
    (p as { display_name?: string | null; username?: string })?.display_name ??
    (p as { display_name?: string | null; username?: string })?.username ??
    'Anónimo';

  const tabs = $derived([
    { value: 'todas', label: 'Todas', count: counts.todas },
    { value: 'aprobadas', label: 'Aprobadas', count: counts.aprobado },
    { value: 'revision', label: 'En revisión', count: counts.pendiente },
    { value: 'borradores', label: 'Borradores', count: counts.borrador },
    ...(data.profile ? [{ value: 'mias', label: 'Mis historias', count: counts.mias }] : []),
  ]);

  function selectTab(value: string) {
    const params = new SvelteURLSearchParams();
    params.set('tab', value);
    if (data.q) params.set('q', data.q);
    // resolve() conserva el tipo ResolvedPathname en el tramo estático, pero el
    // sufijo de búsqueda lo amplía a string: falso positivo de la regla.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(`${resolve('/historias')}?${params.toString()}`);
  }
</script>

<svelte:head>
  <title>Historias — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Historias' }]} class="mb-2" />

<PageHeader
  kicker="Historias del reino"
  title="Crónicas"
  subtitle="Las historias de los personajes: cada una es su propio relato dentro del canon."
>
  {#snippet actions()}
    {#if data.profile}
      <a href={resolve('/historias/nueva')} class="btn btn-primary">
        <Scroll size={18} /> Nueva historia
      </a>
    {/if}
  {/snippet}
</PageHeader>

<div class="mb-6 flex flex-wrap items-center gap-3">
  <form method="GET" action={resolve('/historias')} role="search" class="relative min-w-0 flex-1 max-w-md">
    <input type="hidden" name="tab" value={filter} />
    <Search
      size={16}
      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-azeroth-gold-dim"
      aria-hidden="true"
    />
    <input
      type="search"
      name="q"
      value={data.q}
      placeholder="Buscar por título o personaje..."
      aria-label="Buscar historias por título o personaje"
      class="azeroth-focus input w-full pl-9"
    />
  </form>
  {#if data.q}
    <a href={resolve('/historias')} class="btn btn-ghost btn-sm">
      <X size={14} /> Limpiar filtros
    </a>
  {/if}
</div>

<FilterTabs
  ariaLabel="Filtrar historias"
  value={filter}
  tabs={tabs}
  onchange={selectTab}
/>

{#if data.stories.length === 0}
  <EmptyState
    title="Sin historias"
    description={data.q
      ? 'No hay crónicas que coincidan con la búsqueda. Probá con otro término.'
      : 'No hay historias en esta vista todavía. La primera crónica puede ser la tuya.'}
  />
{:else}
  <div class="grid gap-4 md:grid-cols-2">
    {#each data.stories as story (story.id)}
      <a href={resolve(`/historias/${story.id}`)} class="media-card">
        <div class="flex items-start justify-between gap-2">
          <h3 class="media-title">{story.title}</h3>
          <span class="badge {statusColor(story.status)} badge-sm whitespace-nowrap">
            {statusLabel(story.status)}
          </span>
        </div>
        {#if story.excerpt}
          <p class="media-excerpt">{story.excerpt}</p>
        {/if}
        <div class="media-foot">
          <span class="who">
            <Avatar name={playerName(story.character?.player)} size="sm" />
            por {playerName(story.character?.player)}
            <span class="text-azeroth-faint">· {formatDate(story.created_at)}</span>
          </span>
          {#if story.character}
            <span class="char">
              Personaje: <b class="text-azeroth-gold">{story.character.name}</b>
            </span>
          {/if}
        </div>
      </a>
    {/each}
  </div>
{/if}
