<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import { Scroll } from '@lucide/svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import FilterTabs from '$lib/components/ui/FilterTabs.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let { data }: { data: PageData } = $props();

  let filter = $state('todas');

  const playerName = (p: unknown): string =>
    (p as { display_name?: string | null; username?: string })?.display_name ??
    (p as { display_name?: string | null; username?: string })?.username ??
    'Anónimo';

  const counts = $derived({
    todas: data.stories.length,
    aprobado: data.stories.filter((s) => s.status === 'aprobado').length,
    pendiente: data.stories.filter((s) => s.status === 'pendiente').length,
    borrador: data.stories.filter((s) => s.status === 'borrador').length,
  });

  const filtered = $derived(
    filter === 'todas'
      ? data.stories
      : data.stories.filter((s) => s.status === filter),
  );
</script>

<svelte:head>
  <title>Historias — RolErrante</title>
</svelte:head>

<PageHeader
  kicker="Historias del reino"
  title="Crónicas en curso"
  subtitle="Las historias que cuentan los personajes del censo: cada una es su propio relato dentro del canon."
>
  {#snippet actions()}
    {#if data.profile}
      <a href={resolve('/historias/nueva')} class="btn btn-primary">
        <Scroll size={18} /> Nueva historia
      </a>
    {/if}
  {/snippet}
</PageHeader>

{#if data.stories.length === 0}
  <EmptyState
    title="Sin historias"
    description="No hay historias aprobadas todavía. La primera crónica puede ser la tuya."
  />
{:else}
  <FilterTabs
    ariaLabel="Filtrar historias"
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
      <p>No hay crónicas en este estado.</p>
    </div>
  {:else}
    <div class="grid gap-4 md:grid-cols-2">
      {#each filtered as story (story.id)}
        <a href={resolve(`/historias/${story.id}`)} class="media-card">
          <div class="flex items-start justify-between gap-2">
            <h3 class="media-title">{story.title}</h3>
            <span class="badge {statusColor(story.status)} badge-sm whitespace-nowrap">
              {statusLabel(story.status)}
            </span>
          </div>
          <p class="text-sm text-azeroth-muted">
            Por <span class="text-azeroth-gold">{playerName(story.character?.player)}</span>
            · {formatDate(story.created_at)}
          </p>
          {#if story.character}
            <p class="text-sm">Personaje: <span class="font-semibold">{story.character.name}</span></p>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
{/if}
