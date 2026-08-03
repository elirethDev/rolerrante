<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { resolve } from '$app/paths';
  import ReplyComposer from '$lib/components/forum/ReplyComposer.svelte';
  import ThreadDetail from '$lib/components/forum/ThreadDetail.svelte';
  import WatchModal from '$lib/components/forum/WatchModal.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let watchOpen = $state(false);
</script>

<svelte:head>
  <title>{data.thread.title} — Foro · RolErrante</title>
</svelte:head>

<section class="max-w-3xl mx-auto">
  <div class="flex items-start justify-between gap-4">
    <ThreadDetail
      thread={data.thread}
      threadBody={data.threadBody}
      posts={data.posts}
      entity={data.entity}
      flags={data.flags}
      isLocked={data.isLocked}
      isOwner={data.isOwner}
      isStaff={data.isStaff}
    />

    <div class="shrink-0">
      {#if data.isAuthenticated}
        <button type="button" class="btn btn-outline btn-sm" onclick={() => (watchOpen = true)}>
          {data.follow.following ? 'Siguiendo' : 'Seguir'}
        </button>
      {/if}
    </div>
  </div>

  <div class="mt-6 flex gap-3">
    {#if data.flags.can_post && !data.isLocked}
      <div class="w-full card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h2 class="card-title font-cinzel text-lg mb-2">Responder</h2>
          <ReplyComposer />
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-4">
    {#if data.isOwner || data.isStaff}
      <a href={resolve(`/foro/${data.thread.id}/editar` as any)} class="btn btn-outline">Editar hilo</a>
    {/if}
  </div>
</section>

<WatchModal
  open={watchOpen}
  following={data.follow.following}
  notifyInApp={data.follow.notify_in_app}
  guest={!data.isAuthenticated}
  onClose={() => (watchOpen = false)}
/>
