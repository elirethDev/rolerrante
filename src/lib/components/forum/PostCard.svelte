<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import type { ActionResult } from '@sveltejs/kit';
  import { Share2 } from '@lucide/svelte';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import type { PostView, QuotePayload } from '$lib/forum';
  import { EXCERPT_MAX_LENGTH, toExcerpt } from '$lib/forum-compose';
  import { formatDateTime, formatRelativeTime } from '$lib/utils';
  import ReportModal from './ReportModal.svelte';

  let {
    post,
    threadId,
    editorName = null,
    onCitar = undefined,
    isOp = false,
    replyToAuthor = undefined,
  }: {
    post: PostView;
    threadId: string;
    editorName?: string | null;
    onCitar?: ((payload: QuotePayload) => void) | undefined;
    isOp?: boolean;
    replyToAuthor?: string;
  } = $props();

  const authorName = $derived(post.author?.display_name ?? post.author?.username ?? 'Anónimo');
  const body = $derived(typeof post.body === 'string' ? post.body : '');
  const editMarker = $derived(
    post.edited_at ? `Editado por ${editorName ?? 'usuario'} · ${formatRelativeTime(post.edited_at)}` : null,
  );
  const postAnchorId = $derived(`post-${post.id}`);

  function handleCitar() {
    onCitar?.({
      author_display_name: authorName,
      body_excerpt: toExcerpt(body, EXCERPT_MAX_LENGTH),
      post_id: post.id,
    });
  }

  // Reactions (REQ-REACT-01.3): optimistic toggle with rollback. Guests see the
  // count but no toggle (viewer_has_liked === null -> no identity to toggle).
  const isGuest = $derived(post.viewer_has_liked === null);
  // PostCard is keyed by post.id in the thread detail each block, so the loader
  // values below are stable for this instance — capture them once at mount.
  const seed = (() => ({
    count: post.like_count ?? 0,
    liked: post.viewer_has_liked === true,
  }))();
  let likeCount = $state(seed.count);
  let viewerLiked = $state(seed.liked);
  let likeError = $state<string | null>(null);

  // Runs on submit: apply the optimistic ±1 immediately, keep server state for rollback.
  function toggleLike() {
    const optimistic = {
      count: likeCount + (viewerLiked ? -1 : 1),
      liked: !viewerLiked,
    };
    likeCount = optimistic.count;
    viewerLiked = optimistic.liked;
    likeError = null;

    // Runs after the server answers: failure rolls back to the loader state.
    return async ({ result, update }: { result: ActionResult; update: () => Promise<void> }) => {
      if (result.type === 'failure') {
        likeCount = post.like_count ?? 0;
        viewerLiked = post.viewer_has_liked === true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        likeError = (result.data as any)?.message ?? 'No se pudo actualizar el agradecimiento';
      } else {
        await update();
      }
    };
  }

  // Share/copy post link (REQ-SHARE-01): deep-link to #post-<id> within the thread.
  let copied = $state(false);
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

  function fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    textarea.remove();
    return ok;
  }

  function copyText(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).then(() => true, () => Promise.resolve(fallbackCopy(text)));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  async function copyShareLink() {
    const threadHref = resolve(`/foro/${threadId}`);
    const href = new URL(`${threadHref}#${postAnchorId}`, window.location.origin).toString();
    const ok = await copyText(href);
    if (!ok) return;
    copied = true;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => (copied = false), 2000);
  }
</script>

<article class="post" class:op={isOp} id={postAnchorId}>
  <div class="post-rail">
    <span class="avatar avatar-lg avatar-ring" aria-hidden="true">{authorName.charAt(0).toUpperCase()}</span>
    <span class="post-name" aria-label={authorName}>{authorName}</span>
    <span class="post-role">
      #{post.post_number} · {formatDateTime(post.created_at)}
    </span>
    {#if isOp}
      <span class="badge badge-gold no-dot">Autora</span>
    {/if}
  </div>

  <div class="post-body">
    {#if replyToAuthor}
      <div class="reply-to">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 10c0 4-3 7-8 7v3l-6-5 6-5v3c3 0 5-1 5-3h3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
        Respondiendo a <b>{replyToAuthor}</b>
      </div>
    {/if}

    <div class="post-text">
      <TipTapViewer content={body} />
    </div>

    <div class="post-footer">
      <span class="edit-history" data-testid="edit-marker">
        {#if editMarker}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4L18 10l-4-4L4 16v4zM13.5 6.5l4 4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
          {editMarker}
        {/if}
      </span>

      <div class="post-actions">
        <span class="badge badge-neutral no-dot" data-testid="like-chip">
          <span aria-hidden="true">❤️</span>
          {likeCount} Gracias
        </span>

        {#if !isGuest}
          <form method="POST" action="?/like" use:enhance={toggleLike} class="inline">
            <input type="hidden" name="post_id" value={post.id} />
            <button
              type="submit"
              data-testid="like-toggle"
              aria-pressed={viewerLiked}
              aria-label={viewerLiked ? 'Quitar Gracias' : 'Dar Gracias'}
            >
              <span aria-hidden="true">❤️</span>
              Gracias
            </button>
          </form>
        {/if}

        <button type="button" onclick={handleCitar}>Citar</button>
        <button type="button" onclick={copyShareLink}>
          <Share2 size={16} />
          Compartir
        </button>
        <ReportModal postId={post.id} />
      </div>
    </div>

    {#if likeError}
      <p class="text-xs text-error mt-2" data-testid="like-error" role="alert">{likeError}</p>
    {/if}

    {#if copied}
      <span class="text-xs text-success font-medium" role="status" data-testid="share-feedback">¡Enlace copiado!</span>
    {/if}
  </div>
</article>
