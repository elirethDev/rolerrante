<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import ReplyComposer from '$lib/components/forum/ReplyComposer.svelte';
  import ThreadDetail from '$lib/components/forum/ThreadDetail.svelte';
  import type { QuotePayload } from '$lib/forum';
  import WatchModal from '$lib/components/forum/WatchModal.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let replyTo: QuotePayload | null = $state(null);
  let watchOpen = $state(false);
</script>

<svelte:head>
  <title>{data.thread.title} — Foro · RolErrante</title>
</svelte:head>

<section class="max-w-[1180px] mx-auto">
  <Breadcrumbs
    items={[{ label: 'Foro', href: '/foro' }, { label: data.thread.title }]}
    class="mb-2"
  />

  <div class="flex items-start justify-between gap-4">
    <ThreadDetail
      thread={data.thread}
      threadBody={data.threadBody}
      posts={data.posts}
      entity={data.entity}
      flags={data.flags}
      isLocked={data.isLocked}
      isSticky={data.isSticky}
      isOwner={data.isOwner}
      isStaff={data.isStaff}
      currentPage={data.currentPage}
      totalPages={data.totalPages}
      totalPosts={data.totalPosts}
      onCitar={(payload) => (replyTo = payload)}
    />

    <div class="shrink-0">
      {#if data.isAuthenticated}
        <button type="button" class="btn btn-secondary btn-sm" onclick={() => (watchOpen = true)}>
          {data.follow.following ? 'Siguiendo' : 'Seguir'}
        </button>
      {/if}
    </div>
  </div>

  {#if data.flags.can_post && !data.isLocked}
    <div class="mt-6">
      <ReplyComposer
        draftKey={`forum:draft:${data.thread.id}`}
        quotePayload={replyTo}
        onClearQuote={() => (replyTo = null)}
      />
    </div>
  {/if}

  <div class="mt-4">
    {#if data.isOwner || data.isStaff}
      <a href={resolve(`/foro/${data.thread.id}/editar` as any)} class="btn btn-secondary">Editar hilo</a>
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
