<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { resolve } from '$app/paths';
  import ThreadDetail from '$lib/components/forum/ThreadDetail.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.thread.title} — Foro · RolErrante</title>
</svelte:head>

<section class="max-w-3xl mx-auto">
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

  <div class="mt-6 flex gap-3">
    {#if data.isOwner || data.isStaff}
      <a href={resolve(`/foro/${data.thread.id}/editar` as any)} class="btn btn-outline">Editar hilo</a>
    {/if}
  </div>
</section>
