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
  }: {
    post: PostView;
    threadId: string;
    editorName?: string | null;
    onCitar?: ((payload: QuotePayload) => void) | undefined;
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

<article class="card bg-base-100 border border-azeroth-border mb-4" id={postAnchorId}>
  <div class="card-body">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-base-300 flex items-center justify-center font-cinzel text-azeroth-gold">
        {authorName.charAt(0).toUpperCase()}
      </div>
      <div>
        <p class="font-semibold">{authorName}</p>
        <p class="text-xs text-gray-400">
          #{post.post_number} · {formatDateTime(post.created_at)}
        </p>
      </div>
    </div>

    <div class="prose prose-invert max-w-none mt-3">
      <TipTapViewer content={body} />
    </div>

    {#if editMarker}
      <p class="text-xs text-gray-500 mt-3" data-testid="edit-marker">{editMarker}</p>
    {/if}

    <div class="mt-3 flex justify-end gap-3">
      <ReportModal postId={post.id} />
      <button type="button" class="btn btn-xs btn-ghost" onclick={handleCitar}>Citar</button>
    </div>

    <div class="flex items-center gap-3 mt-3">
      <span class="badge badge-neutral badge-outline gap-1" data-testid="like-chip">
        <span aria-hidden="true">❤️</span>
        {likeCount} Gracias
      </span>

      {#if !isGuest}
        <form method="POST" action="?/like" use:enhance={toggleLike} class="inline">
          <input type="hidden" name="post_id" value={post.id} />
          <button
            type="submit"
            class="btn btn-xs btn-ghost gap-1"
            data-testid="like-toggle"
            aria-pressed={viewerLiked}
            aria-label={viewerLiked ? 'Quitar Gracias' : 'Dar Gracias'}
          >
            <span aria-hidden="true">❤️</span>
            {viewerLiked ? 'Gracias' : 'Gracias'}
          </button>
        </form>
      {/if}
    </div>

    {#if likeError}
      <p class="text-xs text-error mt-2" data-testid="like-error" role="alert">{likeError}</p>
    {/if}

    <div class="flex items-center gap-3 mt-3">
      <button type="button" class="btn btn-ghost btn-xs gap-1" onclick={copyShareLink}>
        <Share2 size={16} />
        Compartir
      </button>
      {#if copied}
        <span class="text-xs text-success font-medium" role="status" data-testid="share-feedback">¡Enlace copiado!</span>
      {/if}
    </div>
  </div>
</article>
