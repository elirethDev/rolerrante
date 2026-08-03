<script lang="ts">
  import { Lock } from '@lucide/svelte';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import type { PermissionFlags } from '$lib/auth';
  import type { PostView, ThreadView } from '$lib/forum';
  import { formatRelativeTime } from '$lib/utils';
  import PostCard from './PostCard.svelte';

  let {
    thread,
    threadBody,
    posts,
    entity,
    flags,
    isLocked,
    isOwner,
    isStaff,
  }: {
    thread: ThreadView;
    threadBody: string;
    posts: PostView[];
    entity: { name: string; status: string } | null;
    flags: PermissionFlags;
    isLocked: boolean;
    isOwner: boolean;
    isStaff: boolean;
  } = $props();

  const authorName = $derived(thread.author?.display_name ?? thread.author?.username ?? 'Anónimo');
  const statusLabels: Record<string, string> = {
    aprobado: 'Aprobado',
    abierto: 'Abierto',
    pendiente: 'Pendiente',
    borrador: 'Borrador',
    rechazado: 'Rechazado',
  };
  const editMarker = $derived(
    thread.edited_at
      ? `Editado por ${thread.author?.display_name ?? thread.author?.username ?? 'usuario'} · ${formatRelativeTime(thread.edited_at)}`
      : null,
  );
</script>

<article>
  <header class="mb-6">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-2xl font-cinzel text-azeroth-gold">{thread.title}</h1>
      {#if isLocked}<Lock size={18} class="text-error" />{/if}
      {#if thread.status === 'pendiente'}
        <span class="badge badge-warning">Pendiente</span>
      {/if}
    </div>

    {#if entity}
      <p class="text-sm text-gray-400 mt-2">
        Vincular:
        <span class="font-medium text-azeroth-gold">{entity.name}</span>
        {#if entity.status}<span class="badge badge-neutral badge-xs ml-1">{statusLabels[entity.status] ?? entity.status}</span>{/if}
      </p>
    {/if}

    <p class="text-sm text-gray-400 mt-1">
      Por <span class="text-azeroth-gold">{authorName}</span>
      {#if editMarker}
        · <span data-testid="thread-edit-marker">{editMarker}</span>
      {/if}
    </p>
  </header>

  <div class="prose prose-invert max-w-none bg-base-100 border border-azeroth-border rounded-lg p-6 mb-4">
    <TipTapViewer content={threadBody} />
  </div>

  <div class="mt-6">
    {#each posts as post (post.id)}
      <PostCard {post} threadId={thread.id} editorName={post.author?.display_name ?? post.author?.username ?? null} />
    {/each}
  </div>
</article>
