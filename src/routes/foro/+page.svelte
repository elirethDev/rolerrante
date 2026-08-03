<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { MessagesSquare } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import CategoryTree from '$lib/components/forum/CategoryTree.svelte';
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
      <p class="text-sm text-gray-400 mt-1">Discusión, historias y crónicas de la comunidad.</p>
    </div>
    {#if data.roleLabel !== 'pendiente' && data.categories.some((c) => c.flags.can_post)}
      <a href={resolve('/foro/nuevo' as any)} class="btn btn-primary">
        <MessagesSquare size={18} /> Nuevo debate
      </a>
    {/if}
  </div>

  {#if data.categories.length === 0}
    <EmptyState title="Aún no hay secciones" description="Pronto habrá foros para debatir." />
  {:else}
    <CategoryTree categories={data.categories} />
  {/if}
</section>
