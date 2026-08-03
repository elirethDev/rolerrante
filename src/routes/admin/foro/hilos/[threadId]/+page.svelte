<script lang="ts">
  import { enhance } from '$app/forms';
  import PermissionPanel from '$lib/components/forum/PermissionPanel.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  const threadId = $derived((data.thread as { id: string }).id);
  const isLocked = $derived((data.thread as { is_locked: boolean }).is_locked);
</script>

<svelte:head>
  <title>Hilo — Panel Admin</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-2">Hilo: {(data.thread as { title: string }).title}</h1>

{#if form?.message}
  <div class="alert alert-error text-sm mb-4">{form.message}</div>
{/if}

<section class="card bg-base-200 border border-azeroth-border mb-6">
  <div class="card-body">
    <div class="flex items-center justify-between">
      <h2 class="card-title font-cinzel text-azeroth-gold">Estado</h2>
      <span class="badge {isLocked ? 'badge-error' : 'badge-success'}">
        {isLocked ? 'Bloqueado' : 'Abierto'}
      </span>
    </div>
    <p class="text-sm text-gray-400">
      El autor nunca puede bloquear su propio hilo; solo GM/admin (REQ-FORUM-04.3).
    </p>
    <div class="flex gap-2">
      {#if isLocked}
        <form method="POST" action="?/unlock" use:enhance>
          <button type="submit" class="btn btn-primary btn-sm">Reabrir hilo</button>
        </form>
      {:else}
        <form method="POST" action="?/lock" use:enhance>
          <button type="submit" class="btn btn-error btn-sm">Bloquear hilo</button>
        </form>
      {/if}
    </div>
  </div>
</section>

<div>
  <PermissionPanel
    action={`/admin/foro/hilos/${threadId}?/setThreadPermissions`}
    targetName="threadId"
    targetValue={threadId}
    permissions={data.threadPermissions}
    form={form}
  />
</div>
