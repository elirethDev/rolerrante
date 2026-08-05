<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { MessagesSquare, Search, X } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import CategoryTree from '$lib/components/forum/CategoryTree.svelte';
  import ThreadList from '$lib/components/forum/ThreadList.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>Foro — RolErrante</title>
</svelte:head>

<div class="max-w-[1180px] mx-auto">
  <PageHeader
    kicker="El salón ahora"
    title="Foro"
    subtitle="Discusión, historias y crónicas de la comunidad."
  >
    {#snippet actions()}
      {#if data.roleLabel !== 'pendiente' && data.categories.some((c) => c.flags.can_post)}
        <a href={resolve('/foro/nuevo' as any)} class="btn btn-primary">
          <MessagesSquare size={18} /> Nuevo debate
        </a>
      {/if}
    {/snippet}
  </PageHeader>

  <form method="get" action={resolve('/foro' as any)} class="mb-6">
    <div class="search-wrap max-w-md">
      <Search aria-hidden="true" />
      <input
        type="search"
        name="q"
        value={data.query ?? ''}
        placeholder="Buscar un hilo o personaje"
        class="input"
      />
      {#if data.isSearch}
        <button
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-azeroth-muted"
          aria-label="Limpiar búsqueda"
        >
          <a href={resolve('/foro' as any)}><X size={18} /></a>
        </button>
      {/if}
    </div>
  </form>

  {#if data.isSearch}
    <div class="mb-4">
      <h2 class="page-title" style="font-size:1.15rem;margin:8px 0 4px">
        Resultados para «{data.query}»
      </h2>
      <p class="page-sub">
        {data.searchResults.length > 0
          ? `${data.searchResults.length} ${data.searchResults.length === 1 ? 'hilo' : 'hilos'} encontrado${data.searchResults.length === 1 ? '' : 's'}`
          : 'No se encontraron hilos.'}
      </p>
    </div>
    {#if data.searchResults.length === 0}
      <EmptyState title="Sin resultados" description="Prueba con otro término de búsqueda." />
    {:else}
      <div class="panel">
        <div class="panel-body p-0">
          <ThreadList threads={data.searchResults} />
        </div>
      </div>
    {/if}
  {:else if data.categories.length === 0}
    <EmptyState title="Aún no hay secciones" description="Pronto habrá foros para debatir." />
  {:else}
    <CategoryTree categories={data.categories} />
  {/if}
</div>
