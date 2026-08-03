<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionResult } from '@sveltejs/kit';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import type { PostView } from '$lib/forum';
  import { formatDateTime, formatRelativeTime } from '$lib/utils';

  let { post, editorName = null }: { post: PostView; editorName?: string | null } = $props();

  const authorName = $derived(post.author?.display_name ?? post.author?.username ?? 'Anónimo');
  const body = $derived(typeof post.body === 'string' ? post.body : '');
  const editMarker = $derived(
    post.edited_at ? `Editado por ${editorName ?? 'usuario'} · ${formatRelativeTime(post.edited_at)}` : null,
  );

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
</script>

<article class="card bg-base-100 border border-azeroth-border mb-4">
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
  </div>
</article>
