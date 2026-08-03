<script lang="ts">
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import type { PostView } from '$lib/forum';
  import { formatDateTime, formatRelativeTime } from '$lib/utils';

  let { post, editorName = null }: { post: PostView; editorName?: string | null } = $props();

  const authorName = $derived(post.author?.display_name ?? post.author?.username ?? 'Anónimo');
  const body = $derived(typeof post.body === 'string' ? post.body : '');
  const editMarker = $derived(
    post.edited_at ? `Editado por ${editorName ?? 'usuario'} · ${formatRelativeTime(post.edited_at)}` : null,
  );
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
  </div>
</article>
