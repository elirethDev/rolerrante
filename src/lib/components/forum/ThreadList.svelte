<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { MessagesSquare, FileText } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import type { ThreadListItem } from '$lib/forum';
  import { formatDate } from '$lib/utils';
  import LockBadge from './LockBadge.svelte';

  let { threads }: { threads: ThreadListItem[] } = $props();

  const contentTypeLabel: Record<string, string> = {
    debate: 'Debate',
    historia: 'Historia',
    ficha: 'Ficha',
    evento: 'Evento',
  };
</script>

<ul class="divide-y divide-azeroth-border">
  {#each threads as t (t.id)}
    <li class="py-3">
      <a href={resolve(`/foro/${t.id}` as any)} class="block hover:bg-base-100 rounded-lg px-2 -mx-2 py-1">
        <div class="flex items-center gap-2">
          {#if t.content_type === 'debate'}
            <MessagesSquare size={16} class="text-azeroth-gold shrink-0" />
          {:else}
            <FileText size={16} class="text-azeroth-gold shrink-0" />
          {/if}
          <span class="font-medium line-clamp-1">{t.title}</span>
          {#if t.is_locked}
            <LockBadge />
          {/if}
        </div>
        <div class="text-xs text-gray-400 mt-1 pl-6 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{contentTypeLabel[t.content_type] ?? t.content_type}</span>
          {#if t.status === 'pendiente'}· <span class="badge badge-warning badge-xs">Pendiente</span>{/if}
          <span>· {formatDate(t.created_at)}</span>
          <span class="inline-flex items-center gap-1" aria-label={`${t.posts_count ?? 0} mensajes`}>
            <MessagesSquare size={12} class="inline" />
            {t.posts_count ?? 0} mensajes
          </span>
          {#if t.lastPost?.author_display_name}
            <span class="inline-flex items-center gap-1">
              <span>Último:</span>
              <span class="text-gray-300 font-medium">{t.lastPost.author_display_name}</span>
            </span>
          {/if}
        </div>
      </a>
    </li>
  {/each}
</ul>
