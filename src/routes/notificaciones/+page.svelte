<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { formatDateTime } from '$lib/utils';
  import { Bell, MessageSquare, CheckCheck } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let markReadForm: HTMLFormElement;

  // Visit marks all notifications as read (REQ-NOTIF-02): fire the server
  // action once on mount so the next layout load drops the bell badge to zero.
  // `use:enhance` keeps this an AJAX submit — WITHOUT it, requestSubmit() issues
  // a full-page POST that reloads the page, remounts this component and fires
  // onMount again, causing an infinite reload loop in the browser.
  onMount(() => {
    markReadForm?.requestSubmit();
  });

  // Explicit "Marcar todas" affordance: mirrors the auto mark-on-visit but with
  // visible feedback. Set optimistically; the row "Nuevo" badge drops at once.
  let marcadas = $state(false);
  function marcarTodas() {
    marcadas = true;
    markReadForm?.requestSubmit();
  }

  // Per-type icon + label (type is CHECK-constrained to 'new_reply'; unknown
  // types fall back to the generic template so future kinds degrade gracefully).
  type NotifVariant = { icon: Component; label: string; message: (n: PageData['notifications'][number]) => string };
  const VARIANTS: Record<string, NotifVariant> = {
    new_reply: {
      icon: MessageSquare,
      label: 'Respuesta',
      message: (n) =>
        `${n.actor?.display_name ?? n.actor?.username ?? 'Alguien'} respondió en ${n.thread?.title ?? 'un hilo'}`,
    },
  };
  const GENERIC: NotifVariant = {
    icon: Bell,
    label: 'Notificación',
    message: () => 'Tienes una notificación de la hermandad',
  };
  const variantFor = (type: string): NotifVariant => VARIANTS[type] ?? GENERIC;
</script>

<svelte:head>
  <title>Notificaciones — RolErrante</title>
</svelte:head>

<PageHeader
  kicker="Cuenta"
  title="Notificaciones"
  subtitle="Respuestas en tus hilos, menciones, revisiones y avisos de la hermandad."
/>

<form
  method="POST"
  action="?/markRead"
  use:enhance
  bind:this={markReadForm}
  aria-hidden="true"
  class="hidden"
></form>

{#if data.notifications.length === 0}
  <EmptyState
    title="Sin notificaciones"
    description="No tenés notificaciones por ahora. Cuando alguien responda en tus hilos, aparecerán aquí."
  />
{:else}
  <div class="max-w-2xl">
    <div class="panel">
      <div class="panel-head">
        <Bell size={18} />
        <h2>Recientes <span class="text-azeroth-faint font-medium">({data.notifications.length})</span></h2>
        <span class="meta">se marcan como leídas al visitar</span>
        {#if data.notifications.some((n) => !n.read_at)}
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            data-testid="mark-all"
            onclick={marcarTodas}
          >
            Marcar todas
          </button>
        {/if}
      </div>
      <div class="panel-body py-0">
        {#each data.notifications as n (n.id)}
          {@const variant = variantFor(n.type)}
          {@const read = marcadas || Boolean(n.read_at)}
          <a href={resolve(`/foro/${n.thread_id}` as any)} class="notif-row {read ? '' : 'unread'}">
            <span data-testid="notif-type-label" class="badge badge-ghost badge-sm shrink-0">
              {variant.label}
            </span>
            <variant.icon size={18} />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-azeroth-text-soft">{variant.message(n)}</p>
              <p class="text-xs text-azeroth-muted mt-0.5">{formatDateTime(n.created_at)}</p>
            </div>
            {#if !read}
              <span class="badge badge-error badge-sm shrink-0">Nuevo</span>
            {/if}
          </a>
        {/each}
      </div>
    </div>
    {#if marcadas}
      <p data-testid="mark-all-done" class="text-xs text-azeroth-faint mt-4 flex items-center gap-1.5">
        <CheckCheck size={14} /> Todas las notificaciones se marcaron como leídas.
      </p>
    {:else}
      <p class="text-xs text-azeroth-faint mt-4 flex items-center gap-1.5">
        <CheckCheck size={14} /> Todas las notificaciones se marcan como leídas al abrir esta página.
      </p>
    {/if}
  </div>
{/if}
