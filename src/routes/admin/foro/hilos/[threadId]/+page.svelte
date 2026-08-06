<script lang="ts">
  import { enhance } from '$app/forms';
  import PermissionPanel from '$lib/components/forum/PermissionPanel.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  const threadId = $derived((data.thread as { id: string }).id);
  const isLocked = $derived((data.thread as { is_locked: boolean }).is_locked);
</script>

<svelte:head>
  <title>Hilo — Panel Admin</title>
</svelte:head>

<Breadcrumbs
  items={[
    { label: 'Admin', href: '/admin' },
    { label: 'Foro', href: '/admin/foro' },
    { label: (data.thread as { title: string }).title },
  ]}
  class="mb-2"
/>

<PageHeader kicker="Panel admin" title={`Hilo: {(data.thread as { title: string }).title}`} />

{#if form?.message}
  <div class="alert alert-error text-sm mb-4">{form.message}</div>
{/if}

<section class="panel mb-6">
  <div class="panel-head">
    <h2>Estado</h2>
    <span class="badge ml-auto {isLocked ? 'badge-error' : 'badge-success'}">
      {isLocked ? 'Bloqueado' : 'Abierto'}
    </span>
  </div>
  <div class="panel-body">
    <p class="text-sm text-azeroth-muted">
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
