<script lang="ts">
  import { Lock } from '@lucide/svelte';
  import type { PermissionFlags } from '$lib/auth';
  import type { PostView, QuotePayload, ThreadView } from '$lib/forum';
  import { formatRelativeTime } from '$lib/utils';
  import Pager from '$lib/components/ui/Pager.svelte';
  import PinBadge from './PinBadge.svelte';
  import LockBadge from './LockBadge.svelte';
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
    totalPosts,
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
    totalPosts?: number;
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
    reply_to_post_id: null,
    replyTo: null,
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
  // OD thread.html:63 meta line — respuestas + fecha de publicación + kicker.
  // No hay columna "vistas" en la DB (confirmado): se muestra el conteo de
  // respuestas reales (totalPosts cuando la página lo tiene, si no las del
  // slice renderizado).
  const replyCount = $derived(totalPosts ?? posts.length);
  const kicker = $derived(
    ({ debate: 'Debate', historia: 'Historia', ficha: 'Ficha', evento: 'Evento' } as Record<string, string>)[
      thread.content_type
    ] ?? 'Foro',
  );
</script>

<article>
  <header>
    <div class="row" style="gap:10px;flex-wrap:wrap">
      {#if isSticky}<PinBadge />{/if}
      {#if isLocked}<LockBadge />{/if}
      {#if thread.status === 'pendiente'}
        <span class="badge badge-warning no-dot">Pendiente</span>
      {/if}
    </div>

    <h1 class="page-title" style="margin:10px 0 0">{thread.title}</h1>

    {#if entity}
      <p style="margin-top:8px;font-size:.85rem;color:var(--text-muted)">
        Vincular:
        <span style="color:var(--gold-soft);font-weight:600">{entity.name}</span>
        {#if entity.status}
          <span class="badge badge-neutral no-dot">{statusLabels[entity.status] ?? entity.status}</span>
        {/if}
      </p>
    {/if}

    <div class="thread-meta-line" data-testid="thread-meta-line">
      <span class="kicker" data-testid="thread-kicker">{kicker}</span>
      <span data-testid="thread-replies">
        {replyCount} {replyCount === 1 ? 'respuesta' : 'respuestas'}
      </span>
      <span data-testid="thread-published">Publicado {formatRelativeTime(thread.created_at)}</span>
      <span class="who">Por <b>{authorName}</b></span>
      {#if editMarker}
        <span data-testid="thread-edit-marker">{editMarker}</span>
      {/if}
    </div>

    {#if isStaff}
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
        <form method="POST" action={isSticky ? '?/unpin' : '?/pin'}>
          <button type="submit" class="btn btn-secondary btn-sm">
            {isSticky ? 'Desfijar hilo' : 'Fijar hilo'}
          </button>
        </form>
        {#if !isLocked}
          <form method="POST" action="?/lock">
            <button type="submit" class="btn btn-secondary btn-sm">Bloquear hilo</button>
          </form>
        {/if}
      </div>
    {/if}
  </header>

  {#if isLocked}
    <div class="lock-banner" data-testid="lock-banner">
      <Lock size={20} aria-hidden="true" />
      <div>
        Este hilo está <b>bloqueado</b> — los autores no pueden responder mientras el hilo permanezca bloqueado.
      </div>
      {#if isStaff}
        <form method="POST" action="?/unlock">
          <button type="submit" class="btn btn-secondary btn-sm">Reabrir hilo</button>
        </form>
      {/if}
    </div>
  {/if}

  <PostCard
    post={opPost}
    threadId={thread.id}
    onCitar={onCitar}
    editorName={opEditorName}
    isOp={true}
    replyToAuthor={undefined}
  />

  <div class="stack">
    {#each posts as post, i (post.id)}
      <div class="ornament" aria-hidden="true">
        <span class="dia"></span>
      </div>
      {@const replyToAuthor =
        post.replyTo?.author ? (post.replyTo.author.display_name ?? post.replyTo.author.username ?? null) : undefined}
      <PostCard
        {post}
        threadId={thread.id}
        {onCitar}
        editorName={post.author?.display_name ?? post.author?.username ?? null}
        isOp={false}
        {replyToAuthor}
      />
    {/each}
  </div>

  {#if totalPages > 1}
    <Pager
      total={totalPages}
      current={currentPage}
      onChange={(page) => {
        if (page === currentPage) return;
        window.location.href = `?page=${page}`;
      }}
    />
  {/if}
</article>