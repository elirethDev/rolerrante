<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { MessagesSquare, Search, X } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import CategoryTree from '$lib/components/forum/CategoryTree.svelte';
  import ThreadList from '$lib/components/forum/ThreadList.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>Foro — RolErrante</title>
</svelte:head>

<section class="max-w-5xl mx-auto">
  <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
    <div>
      <h1 class="text-3xl font-cinzel text-azeroth-gold">Foro</h1>
      <p class="text-sm text-azeroth-muted mt-1">Discusión, historias y crónicas de la comunidad.</p>
    </div>
    {#if data.roleLabel !== 'pendiente' && data.categories.some((c) => c.flags.can_post)}
      <a href={resolve('/foro/nuevo' as any)} class="btn btn-primary">
        <MessagesSquare size={18} /> Nuevo debate
      </a>
    {/if}
  </div>

  <form method="get" action={resolve('/foro' as any)} class="mb-6">
    <label class="input input-bordered flex items-center gap-2 w-full md:w-96">
      <Search size={18} class="text-azeroth-muted shrink-0" />
      <input
        type="search"
        name="q"
        value={data.query ?? ''}
        placeholder="Buscar un hilo o personaje"
        class="grow"
      />
      {#if data.isSearch}
        <a href={resolve('/foro' as any)} aria-label="Limpiar búsqueda">
          <X size={18} class="text-azeroth-muted" />
        </a>
      {/if}
    </label>
  </form>

  {#if data.isSearch}
    <div class="mb-4">
      <h2 class="text-lg font-cinzel text-azeroth-gold">
        Resultados para «{data.query}»
      </h2>
      <p class="text-sm text-azeroth-muted mt-1">
        {data.searchResults.length > 0
          ? `${data.searchResults.length} ${data.searchResults.length === 1 ? 'hilo' : 'hilos'} encontrado${data.searchResults.length === 1 ? '' : 's'}`
          : 'No se encontraron hilos.'}
      </p>
    </div>
    {#if data.searchResults.length === 0}
      <EmptyState title="Sin resultados" description="Prueba con otro término de búsqueda." />
    {:else}
      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <ThreadList threads={data.searchResults} />
        </div>
      </div>
    {/if}
  {:else if data.categories.length === 0}
    <EmptyState title="Aún no hay secciones" description="Pronto habrá foros para debatir." />
  {:else}
    <CategoryTree categories={data.categories} />
  {/if}
</section>
