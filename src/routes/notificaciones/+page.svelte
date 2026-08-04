<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { formatDateTime } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let markReadForm: HTMLFormElement;

  // Visit marks all notifications as read (REQ-NOTIF-02): fire the server
  // action once on mount so the next layout load drops the bell badge to zero.
  onMount(() => {
    markReadForm?.requestSubmit();
  });
</script>

<svelte:head>
  <title>Notificaciones — Foro · RolErrante</title>
</svelte:head>

<section class="max-w-2xl mx-auto">
  <h1 class="font-cinzel text-2xl mb-4">Notificaciones</h1>

  <form
    method="POST"
    action="?/markRead"
    bind:this={markReadForm}
    aria-hidden="true"
    class="hidden"
  ></form>

  {#if data.notifications.length === 0}
    <p class="text-azeroth-muted">No tenés notificaciones por ahora.</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each data.notifications as n (n.id)}
        <li
          class="card bg-base-200 border border-azeroth-border {n.read_at ? '' : 'border-l-4 border-l-azeroth-gold'}"
        >
          <a href={resolve(`/foro/${n.thread_id}` as any)} class="card-body block p-4">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm">
                <span class="font-semibold">{n.actor?.display_name ?? n.actor?.username ?? 'Alguien'}</span>
                respondió en <span class="font-semibold">{n.thread?.title ?? 'un hilo'}</span>
              </p>
              {#if !n.read_at}
                <span class="badge badge-error badge-sm shrink-0">Nuevo</span>
              {/if}
            </div>
            <p class="text-xs text-azeroth-muted mt-1">{formatDateTime(n.created_at)}</p>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>
