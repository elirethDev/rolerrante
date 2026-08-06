<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { Info, MessagesSquare, Search, X } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import CategoryTree from '$lib/components/forum/CategoryTree.svelte';
  import ThreadList from '$lib/components/forum/ThreadList.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import { validateForumImageUrls } from '$lib/auth';
  import type { CategoryNode } from '$lib/forum';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let helpOpen = $state(false);
  let quickOpen = $state(false);
  let qcCategory = $state('');
  let qcTitle = $state('');
  let qcContent = $state('');
  let qcSticky = $state(false);
  let qcAllowReplies = $state(true);

  const canPostAny = $derived(
    data.roleLabel !== 'pendiente' && data.categories.some((c) => c.flags.can_post),
  );

  // Client-side mirror of the server validateForumImageUrls() (REQ-FORUM-03.5).
  function isValidImageUrl(url: string): boolean {
    return validateForumImageUrls(`<img src="${url}">`).valid;
  }

  const postableRoots = $derived(
    data.categories.filter((c) => c.flags.can_post),
  );

  function postableChildren(parent: CategoryNode): CategoryNode[] {
    return parent.children.filter((c) => c.flags.can_post);
  }
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
      {#if canPostAny}
        <button type="button" class="btn btn-primary" onclick={() => (quickOpen = true)}>
          <MessagesSquare size={18} /> Nuevo debate
        </button>
      {/if}
    {/snippet}
  </PageHeader>

  <div class="notice" data-testid="foro-notice">
    <Info aria-hidden="true" />
    <p>
      La plaza es de lectura pública: podés leer todos los hilos y debates, pero
      para crear un nuevo hilo o responder necesitás una cuenta con permiso en la sección.
    </p>
  </div>

  <div class="mb-6 flex items-start gap-3 flex-wrap">
    <form method="get" action={resolve('/foro' as any)}>
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
          <a
            href={resolve('/foro' as any)}
            aria-label="Limpiar búsqueda"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-azeroth-muted"
          >
            <X size={18} />
          </a>
        {/if}
      </div>
    </form>
    <button type="button" class="btn btn-outline btn-sm" onclick={() => (helpOpen = true)}>Ayuda</button>
  </div>

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

<Modal bind:open={helpOpen} title="Ayuda de la plaza">
  <ul class="list-disc pl-5 space-y-2 text-sm text-azeroth-text-soft">
    <li>
      <strong class="text-base-content">Crear un debate:</strong> usá «Nuevo debate», elegí la
      sección, escribí un título y el contenido, y enviá. Los hilos nuevos quedan abiertos para
      respuestas de la comunidad.
    </li>
    <li>
      <strong class="text-base-content">Lectura pública:</strong> los invitados pueden leer todos
      los hilos, pero para publicar necesitás una cuenta con permiso en esa sección.
    </li>
    <li>
      <strong class="text-base-content">Hilos bloqueados:</strong> permanecen en modo solo lectura
      hasta que un moderador los reabra.
    </li>
    <li>
      <strong class="text-base-content">Reportes:</strong> si un mensaje infringe las reglas,
      usá «Reportar» y el equipo de moderación lo revisa.
    </li>
  </ul>
</Modal>

<Modal bind:open={quickOpen} title="Nuevo debate">
  <form method="POST" action="?/quickCreate" data-testid="quick-create-form" class="space-y-4">
    <Field label="Sección" required>
      {#snippet ctrl()}
        <select id="qc-category" name="category_id" class="select" bind:value={qcCategory} required>
          <option value="" disabled>Elegí una sección</option>
          {#each postableRoots as root (root.id)}
            {@const children = postableChildren(root)}
            {#if children.length > 0}
              <optgroup label={root.name}>
                <option value={root.id}>{root.name}</option>
                {#each children as child (child.id)}
                  <option value={child.id}>{child.name}</option>
                {/each}
              </optgroup>
            {:else}
              <option value={root.id}>{root.name}</option>
            {/if}
          {/each}
        </select>
      {/snippet}
    </Field>

    <Field label="Título" required>
      {#snippet ctrl()}
        <input id="qc-title" name="title" type="text" class="input" bind:value={qcTitle} required />
      {/snippet}
    </Field>

    <input type="hidden" name="content" bind:value={qcContent} />
    <Field label="Contenido" required>
      {#snippet ctrl()}
        <TipTapEditor
          content={qcContent}
          onChange={(html) => (qcContent = html)}
          validateImageUrl={isValidImageUrl}
        />
      {/snippet}
    </Field>

    {#if data.isStaff}
      <label class="label cursor-pointer justify-start gap-2">
        <input type="checkbox" name="is_sticky" class="checkbox checkbox-sm" bind:checked={qcSticky} />
        <span class="text-sm">Fijar (destacarlo en la sección)</span>
      </label>
    {/if}

    <label class="label cursor-pointer justify-start gap-2">
      <input
        type="checkbox"
        name="allow_replies"
        class="checkbox checkbox-sm"
        bind:checked={qcAllowReplies}
      />
      <span class="text-sm">Permitir respuestas</span>
    </label>

    <div class="flex items-center justify-between pt-1">
      <a href={resolve('/foro/nuevo' as any)} class="btn btn-ghost btn-sm">
        Usar el editor completo
      </a>
      <button type="submit" class="btn btn-primary">Crear debate</button>
    </div>
  </form>
</Modal>
