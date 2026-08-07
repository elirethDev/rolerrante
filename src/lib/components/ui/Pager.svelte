<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  interface Props {
    total: number;
    current: number;
    onChange?: (page: number) => void;
    class?: string;
  }

  let { total, current, onChange, class: className = '' }: Props = $props();

  function buildPages(total: number, current: number): (number | 'ellipsis')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);
    if (start > 2) pages.push('ellipsis');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total - 1) pages.push('ellipsis');
    pages.push(total);
    return pages;
  }

  const pages = $derived(buildPages(total, current));
</script>

{#if total > 0}
  <nav class="pager {className}" aria-label="Paginación">
    <button
      type="button"
      class="pg"
      disabled={current <= 1}
      onclick={() => onChange?.(current - 1)}
      aria-label="Anterior"
      aria-disabled={current <= 1}
    >
      <ChevronLeft size={18} aria-hidden="true" />
    </button>

    {#each pages as page, i (page === 'ellipsis' ? `e${i}` : page)}
      {#if page === 'ellipsis'}
        <span class="pg" style="background:none;border-color:transparent;color:var(--text-muted)" aria-hidden="true">…</span>
      {:else}
        <button
          type="button"
          class:on={page === current}
          aria-current={page === current ? 'page' : undefined}
          class="pg"
          onclick={() => onChange?.(page as number)}
        >
          {page}
        </button>
      {/if}
    {/each}

    <button
      type="button"
      class="pg"
      disabled={current >= total}
      onclick={() => onChange?.(current + 1)}
      aria-label="Siguiente"
      aria-disabled={current >= total}
    >
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  </nav>
{/if}

<style>
  .pager .pg:disabled {
    pointer-events: none;
    opacity: 0.4;
  }
</style>