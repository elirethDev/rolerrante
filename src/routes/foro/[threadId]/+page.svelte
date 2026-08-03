<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { resolve } from '$app/paths';
  import ReplyComposer from '$lib/components/forum/ReplyComposer.svelte';
  import ThreadDetail from '$lib/components/forum/ThreadDetail.svelte';
  import type { QuotePayload } from '$lib/forum';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let replyTo: QuotePayload | null = $state(null);
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
    currentPage={data.currentPage}
    totalPages={data.totalPages}
    onCitar={(payload) => (replyTo = payload)}
  />

  <div class="mt-6 flex gap-3">
    {#if data.flags.can_post && !data.isLocked}
      <div class="w-full card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h2 class="card-title font-cinzel text-lg mb-2">Responder</h2>
          <ReplyComposer
            draftKey={`forum:draft:${data.thread.id}`}
            quotePayload={replyTo}
            onClearQuote={() => (replyTo = null)}
          />
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
