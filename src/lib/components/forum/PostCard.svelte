<script lang="ts">
  import { resolve } from '$app/paths';
  import { Share2 } from '@lucide/svelte';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import type { PostView } from '$lib/forum';
  import { formatDateTime, formatRelativeTime } from '$lib/utils';

  let {
    post,
    threadId,
    editorName = null,
  }: { post: PostView; threadId: string; editorName?: string | null } = $props();

  const authorName = $derived(post.author?.display_name ?? post.author?.username ?? 'Anónimo');
  const body = $derived(typeof post.body === 'string' ? post.body : '');
  const editMarker = $derived(
    post.edited_at ? `Editado por ${editorName ?? 'usuario'} · ${formatRelativeTime(post.edited_at)}` : null,
  );
  const postAnchorId = $derived(`post-${post.id}`);

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
