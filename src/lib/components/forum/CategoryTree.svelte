<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { FolderOpen } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import type { CategoryNode, LastPostInfo } from '$lib/forum';
  import { formatRelativeTime } from '$lib/utils';

  let { categories }: { categories: CategoryNode[] } = $props();

  function visibleChildren(cat: CategoryNode): CategoryNode[] {
    return cat.children.filter((c) => c.flags.can_view);
  }

  // OD row counts use compact forms ("1.1k").
  function compact(n: number): string {
    if (n >= 1000) {
      const k = n / 1000;
      const fixed = Number.isInteger(k) ? String(k) : k.toFixed(1).replace('.', ',');
      return `${fixed}k`;
    }
    return String(n);
  }

  function lastPostBlock(last: LastPostInfo | null | undefined) {
    if (!last?.author_display_name) return null;
    return {
      author: last.author_display_name,
      avatar: last.avatar_url ?? '',
      title: last.thread_title ?? '',
      threadId: last.thread_id ?? '',
      timeAgo: last.created_at ? formatRelativeTime(last.created_at) : '',
      alt: `Último mensaje de ${last.author_display_name}`,
    };
  }
</script>

{#snippet lastpost(last: ReturnType<typeof lastPostBlock>)}
  <div class="lastpost">
    {#if last}
      {#if last.avatar}
        <span class="avatar avatar-sm avatar-ring">
          <img src={last.avatar} alt={last.alt} />
        </span>
      {:else}
        <span class="avatar avatar-sm avatar-ring" aria-hidden="true">
          {last.author.charAt(0).toUpperCase()}
        </span>
      {/if}
      <div class="lp-t">
        {#if last.threadId}
          <a href={resolve(`/foro/${last.threadId}` as any)} data-testid="last-thread-link">
            {last.title || 'Último mensaje'}
          </a>
        {:else}
          <span class="lp-title">{last.title || 'Último mensaje'}</span>
        {/if}
        <div class="lp-meta">
          por <b>{last.author}</b>
          {#if last.timeAgo}· {last.timeAgo}{/if}
        </div>
      </div>
    {:else}
      <span class="lp-empty">Sin actividad</span>
    {/if}
  </div>
{/snippet}

{#each categories as cat (cat.id)}
  {@const rows = visibleChildren(cat)}
  {@const leafReachable = cat.children.length === 0 && cat.flags.can_view}
  {#if rows.length > 0 || leafReachable}
    <section class="forum-group" data-forum-group>
      <h2 class="forum-group-title">
        {#if leafReachable}
          <a href={resolve(`/foro/categoria/${cat.id}` as any)}>{cat.name}</a>
        {:else}
          {cat.name}
        {/if}
      </h2>
      <div class="forum-panel">
        {#if rows.length > 0}
          <div class="forum-cat" data-testid="forum-cat">
            <FolderOpen size={18} />
            <span class="forum-cat-name">{cat.description ?? cat.name}</span>
            <span class="meta">
              <span>
                <b>{compact(rows.reduce((n, r) => n + (r.threads_count ?? 0), 0))}</b>temas
              </span>
              <span>
                <b>{compact(rows.reduce((n, r) => n + (r.posts_count ?? 0), 0))}</b>mensajes
              </span>
            </span>
          </div>
        {/if}

        {#if rows.length > 0}
          {#each rows as child (child.id)}
            {@const last = lastPostBlock(child.lastPost)}
            <article class="forum-row" data-testid="forum-row">
              <a href={resolve(`/foro/categoria/${child.id}` as any)} class="forum-main">
                <span class="ico"><FolderOpen size={20} /></span>
                <span class="forum-row-text">
                  <span class="forum-title">{child.name}</span>
                  {#if child.description}
                    <span class="forum-desc">{child.description}</span>
                  {/if}
                </span>
              </a>
              <div class="forum-stats" data-testid="forum-stats">
                <b>{compact(child.threads_count ?? 0)}</b><span>temas</span>
                <b>{compact(child.posts_count ?? 0)}</b><span>mensajes</span>
              </div>
              {@render lastpost(last)}
            </article>
          {/each}
        {:else}
          {@const last = lastPostBlock(cat.lastPost)}
          <article class="forum-row" data-testid="forum-row">
            <a href={resolve(`/foro/categoria/${cat.id}` as any)} class="forum-main">
              <span class="ico"><FolderOpen size={20} /></span>
              <span class="forum-row-text">
                <span class="forum-title">{cat.name}</span>
                {#if cat.description}
                  <span class="forum-desc">{cat.description}</span>
                {/if}
              </span>
            </a>
            <div class="forum-stats" data-testid="forum-stats">
              <b>{compact(cat.threads_count ?? 0)}</b><span>temas</span>
              <b>{compact(cat.posts_count ?? 0)}</b><span>mensajes</span>
            </div>
            {@render lastpost(last)}
          </article>
        {/if}
      </div>
    </section>
  {/if}
{/each}