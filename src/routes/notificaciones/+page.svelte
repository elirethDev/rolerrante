<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { formatDateTime } from '$lib/utils';
  import { Bell, MessageSquare, CheckCheck } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
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

<Breadcrumbs items={[{ label: 'Notificaciones' }]} class="mb-2" />

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
  <div class="notif-wrap">
    <div class="notif-list" data-testid="notif-list">
      {#each data.notifications as n (n.id)}
        {@const variant = variantFor(n.type)}
        {@const read = marcadas || Boolean(n.read_at)}
        <a href={resolve(`/foro/${n.thread_id}` as any)} class="notif {read ? '' : 'unread'}">
          <span class="sr-only" data-testid="notif-type-label">{variant.label}</span>
          <span class="notif-ico">
            <variant.icon size={19} />
          </span>
          <div class="notif-main">
            <p class="notif-text m-0">{variant.message(n)}</p>
            <div class="notif-time">{formatDateTime(n.created_at)}</div>
          </div>
          {#if !read}
            <span class="badge badge-error badge-sm shrink-0">Nuevo</span>
          {/if}
        </a>
      {/each}
    </div>

    <span class="mark-all">
      Al visitar esta página, las notificaciones se marcan como leídas.
      <button type="button" data-testid="mark-all" onclick={marcarTodas}>Marcar todas →</button>
    </span>

    {#if marcadas}
      <p data-testid="mark-all-done" class="text-xs text-azeroth-faint mt-4 flex items-center gap-1.5">
        <CheckCheck size={14} /> Todas las notificaciones se marcaron como leídas.
      </p>
    {/if}
  </div>
{/if}
