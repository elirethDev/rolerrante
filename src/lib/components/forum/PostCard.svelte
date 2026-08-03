<script lang="ts">
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import type { PostView, QuotePayload } from '$lib/forum';
  import { EXCERPT_MAX_LENGTH, toExcerpt } from '$lib/forum-compose';
  import { formatDateTime, formatRelativeTime } from '$lib/utils';

  let {
    post,
    editorName = null,
    onCitar = undefined,
  }: {
    post: PostView;
    editorName?: string | null;
    onCitar?: ((payload: QuotePayload) => void) | undefined;
  } = $props();

  const authorName = $derived(post.author?.display_name ?? post.author?.username ?? 'Anónimo');
  const body = $derived(typeof post.body === 'string' ? post.body : '');
  const editMarker = $derived(
    post.edited_at ? `Editado por ${editorName ?? 'usuario'} · ${formatRelativeTime(post.edited_at)}` : null,
  );

  function handleCitar() {
    onCitar?.({
      author_display_name: authorName,
      body_excerpt: toExcerpt(body, EXCERPT_MAX_LENGTH),
      post_id: post.id,
    });
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

    <div class="mt-3 flex justify-end">
      <button type="button" class="btn btn-xs btn-ghost" onclick={handleCitar}>Citar</button>
    </div>
  </div>
</article>
