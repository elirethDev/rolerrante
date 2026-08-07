<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { resolve } from '$app/paths';
  import type { ThreadListItem } from '$lib/forum';
  import { formatDate } from '$lib/utils';
  import LockBadge from './LockBadge.svelte';
  import PinBadge from './PinBadge.svelte';

  let { threads }: { threads: ThreadListItem[] } = $props();

  const contentTypeLabel: Record<string, string> = {
    debate: 'Debate',
    historia: 'Historia',
    ficha: 'Ficha',
    evento: 'Evento',
  };
</script>

<ul class="stack">
  {#each threads as t (t.id)}
    <li class="thread-row">
      <div class="thread-flags">
        {#if t.is_sticky}
          <PinBadge />
        {/if}
        {#if t.is_locked}
          <LockBadge />
        {/if}
      </div>
      <div class="thread-main">
        <a class="thread-title" href={resolve(`/foro/${t.id}` as any)}>{t.title}</a>
        <div class="thread-meta">
          <span class="tag">{contentTypeLabel[t.content_type] ?? t.content_type}</span>
          {#if t.status === 'pendiente'}
            <span class="badge badge-warning no-dot">Pendiente</span>
          {/if}
          <span>{formatDate(t.created_at)}</span>
          {#if t.lastPost?.author_display_name}
            <span data-testid="last-post">
              <span>Último:</span>
              <span class="font-medium" style="color:var(--text-soft)">{t.lastPost.author_display_name}</span>
            </span>
          {/if}
        </div>
      </div>
      <div class="thread-count">
        <b>{`${t.posts_count ?? 0} mensajes`}</b>
      </div>
    </li>
  {/each}
</ul>