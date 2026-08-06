<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  /* eslint-disable svelte/no-navigation-without-resolve -- los links de abajo
     componen query strings (nuevo pre-seccionado + paginación); resolve() no
     admite query strings y la regla no puede verificar templates con sufijo
     (mismo falso positivo que historias/+page.svelte). */
  import { FolderOpen, MessageSquarePlus, MessagesSquare } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import LockBadge from '$lib/components/forum/LockBadge.svelte';
  import PinBadge from '$lib/components/forum/PinBadge.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import { formatDate, formatRelativeTime } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // resolve() no admite query strings: el ?categoria= / ?page= se compone aquí.
  const nuevoHref = `${resolve('/foro/nuevo' as any)}?categoria=${data.category.id}`;
  const pageHref = (page: number) =>
    `${resolve(`/foro/categoria/${data.category.id}` as any)}?page=${page}`;
</script>

<svelte:head>
  <title>{data.category.name} — Foro · RolErrante</title>
</svelte:head>

<section class="max-w-[1180px] mx-auto">
  <Breadcrumbs items={[{ label: 'Foro', href: '/foro' }, { label: data.category.name }]} />

  <PageHeader
    kicker="Foro"
    title={data.category.name}
    subtitle={data.category.description ?? undefined}
  >
    {#snippet actions()}
      {#if data.flags.can_post}
        <a
          href={nuevoHref}
          class="btn btn-primary"
          data-testid="new-thread-link"
        >
          <MessageSquarePlus size={18} /> Nuevo debate
        </a>
      {/if}
    {/snippet}
  </PageHeader>

  {#if data.children.length > 0}
    <nav class="mb-6 flex flex-wrap items-center gap-2" aria-label="Subsecciones">
      <span class="text-xs uppercase tracking-widest text-azeroth-faint font-bold">Subsecciones</span>
      {#each data.children as child (child.id)}
        <a
          href={resolve(`/foro/categoria/${child.id}` as any)}
          class="btn btn-outline btn-xs"
          data-testid="child-section-link"
        >
          {child.name}
        </a>
      {/each}
    </nav>
  {/if}

  {#if data.threads.length === 0}
    <EmptyState
      title="Todavía no hay hilos"
      description="Sé la primera persona en abrir un debate en esta sección."
    />
  {:else}
    <div class="panel">
      <div class="panel-head">
        <h2>Debates</h2>
        <span class="meta">
          {data.totalThreads} {data.totalThreads === 1 ? 'hilo' : 'hilos'}
        </span>
      </div>
      <div class="panel-body p-0">
        <ul class="divide-y divide-azeroth-border">
          {#each data.threads as t (t.id)}
            <li class="py-3 px-4">
              <a
                href={resolve(`/foro/${t.id}` as any)}
                class="block hover:bg-base-100 rounded-lg px-2 -mx-2 py-1"
              >
                <div class="flex items-center gap-2">
                  {#if t.content_type === 'debate'}
                    <MessagesSquare size={16} class="text-azeroth-gold shrink-0" />
                  {:else}
                    <FolderOpen size={16} class="text-azeroth-gold shrink-0" />
                  {/if}
                  <span class="font-medium line-clamp-1">{t.title}</span>
                  {#if t.is_sticky}
                    <PinBadge />
                  {/if}
                  {#if t.is_locked}
                    <LockBadge />
                  {/if}
                </div>
                <div
                  class="text-xs text-azeroth-muted mt-1 pl-6 flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <span>por {t.author?.display_name ?? t.author?.username ?? 'desconocido'}</span>
                  <span>· {formatDate(t.created_at)}</span>
                  <span class="inline-flex items-center gap-1" aria-label={`${t.posts_count ?? 0} mensajes`}>
                    <MessagesSquare size={12} class="inline" />
                    {t.posts_count ?? 0} mensajes
                  </span>
                  {#if t.lastPost?.author_display_name}
                    <span class="inline-flex items-center gap-1" data-testid="last-post">
                      <span>Último:</span>
                      <span class="text-azeroth-text-soft font-medium">{t.lastPost.author_display_name}</span>
                      {#if t.lastPost.created_at}
                        <span class="text-azeroth-faint">{formatRelativeTime(t.lastPost.created_at)}</span>
                      {/if}
                    </span>
                  {/if}
                </div>
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    {#if data.totalPages > 1}
      <nav class="mt-5 flex items-center justify-center gap-3" aria-label="Paginación de hilos">
        <a
          href={pageHref(data.currentPage - 1)}
          aria-disabled={data.currentPage <= 1}
          class="btn btn-outline btn-xs"
        >
          Anterior
        </a>
        <span class="text-sm text-azeroth-muted">
          Página {data.currentPage} de {data.totalPages}
        </span>
        <a
          href={pageHref(data.currentPage + 1)}
          aria-disabled={data.currentPage >= data.totalPages}
          class="btn btn-outline btn-xs"
        >
          Siguiente
        </a>
      </nav>
    {/if}
  {/if}
</section>