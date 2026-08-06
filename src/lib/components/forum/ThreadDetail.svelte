<script lang="ts">
  import { Lock } from '@lucide/svelte';
  import type { PermissionFlags } from '$lib/auth';
  import type { PostView, QuotePayload, ThreadView } from '$lib/forum';
  import { formatRelativeTime } from '$lib/utils';
  import Pager from '$lib/components/ui/Pager.svelte';
  import PinBadge from './PinBadge.svelte';
  import PostCard from './PostCard.svelte';

  let {
    thread,
    threadBody,
    posts,
    entity,
    flags,
    isLocked,
    isSticky,
    isOwner,
    isStaff,
    onCitar = undefined,
    currentPage = 1,
    totalPages = 1,
  }: {
    thread: ThreadView;
    threadBody: string;
    posts: PostView[];
    entity: { name: string; status: string } | null;
    flags: PermissionFlags;
    isLocked: boolean;
    isSticky: boolean;
    isOwner: boolean;
    isStaff: boolean;
    onCitar?: ((payload: QuotePayload) => void) | undefined;
    currentPage?: number;
    totalPages?: number;
  } = $props();

  const authorName = $derived(thread.author?.display_name ?? thread.author?.username ?? 'Anónimo');
  // The OP is the thread body itself (not a posts row): reframe it as a PostView so
  // it renders with the same action bar as replies (OD alignment). like_count /
  // viewer_has_liked are null ⇒ PostCard treats it like a guest view: read-only
  // Gracias chip, no toggle (there is no reactions row for the OP).
  const opPost = $derived<PostView>({
    id: thread.id,
    post_number: 0,
    body: threadBody,
    author_id: thread.author_id,
    created_at: thread.created_at,
    edited_at: thread.edited_at,
    edited_by: thread.edited_by,
    author: thread.author ?? null,
    like_count: null,
    viewer_has_liked: null,
  });
  const opEditorName = $derived(thread.author?.display_name ?? thread.author?.username ?? null);
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
      {#if isSticky}<PinBadge />{/if}
      {#if isLocked}<Lock size={18} class="text-error" />{/if}
      {#if thread.status === 'pendiente'}
        <span class="badge badge-warning">Pendiente</span>
      {/if}
    </div>

    {#if isStaff}
      <div class="mt-2 flex flex-wrap gap-2">
        <form method="POST" action={isSticky ? '?/unpin' : '?/pin'}>
          <button type="submit" class="btn btn-outline btn-xs">
            {isSticky ? 'Desfijar hilo' : 'Fijar hilo'}
          </button>
        </form>
        {#if !isLocked}
          <form method="POST" action="?/lock">
            <button type="submit" class="btn btn-outline btn-xs">Bloquear hilo</button>
          </form>
        {/if}
      </div>
    {/if}

    {#if entity}
      <p class="text-sm text-azeroth-muted mt-2">
        Vincular:
        <span class="font-medium text-azeroth-gold">{entity.name}</span>
        {#if entity.status}<span class="badge badge-neutral badge-xs ml-1">{statusLabels[entity.status] ?? entity.status}</span>{/if}
      </p>
    {/if}

    <p class="text-sm text-azeroth-muted mt-1">
      Por <span class="text-azeroth-gold">{authorName}</span>
      {#if editMarker}
        · <span data-testid="thread-edit-marker">{editMarker}</span>
      {/if}
    </p>
  </header>

  {#if isLocked}
    <div class="alert alert-error mb-6" data-testid="lock-banner">
      <Lock size={20} />
      <div>
        <p class="font-semibold">Este hilo está bloqueado</p>
        <p class="text-sm opacity-80">
          Los autores no pueden responder mientras el hilo permanezca bloqueado.
        </p>
        {#if isStaff}
          <form method="POST" action="?/unlock" class="mt-2">
            <button type="submit" class="btn btn-outline btn-xs">Reabrir hilo</button>
          </form>
        {/if}
      </div>
    </div>
  {/if}

  <PostCard post={opPost} threadId={thread.id} onCitar={onCitar} editorName={opEditorName} />

  <div class="mt-6">
    {#each posts as post (post.id)}
      <PostCard {post} threadId={thread.id} {onCitar} editorName={post.author?.display_name ?? post.author?.username ?? null} />
    {/each}
  </div>

  {#if totalPages > 1}
    <div class="mt-6 flex justify-center">
      <Pager
        total={totalPages}
        current={currentPage}
        onChange={(page) => {
          if (page === currentPage) return;
          window.location.href = `?page=${page}`;
        }}
      />
    </div>
  {/if}
</article>
